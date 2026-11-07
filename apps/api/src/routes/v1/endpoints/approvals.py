import json
import os
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from packages.database.hash_chain import global_audit_chain
from pydantic import BaseModel

from apps.api.src.services.auth import Principal, Role, require_roles
from apps.api.src.services.payments.factory import PaymentGatewayFactory

router = APIRouter()


class ApproveRequest(BaseModel):
    amount_cents: Optional[int] = None
    merchant: Optional[str] = None
    category: Optional[str] = "General"


_STORE_PATH = os.path.join(os.path.dirname(__file__), "approvals_store.json")

_INITIAL_SEED: Dict[str, dict] = {
    "req-1": {
        "id": "req-1",
        "merchant": "Linear",
        "item": "Business workspace · 12 seats",
        "amount": 192,
        "amount_cents": 19200,
        "time": "2 min ago",
        "reason": "Annual billing conflicts with mandate m-1",
        "status": "pending",
        "confidence": 94,
    },
    "req-2": {
        "id": "req-2",
        "merchant": "B&H Photo",
        "item": "Logitech Brio 4K webcam",
        "amount": 149,
        "amount_cents": 14900,
        "time": "18 min ago",
        "reason": "Price is within threshold; new merchant requires review",
        "status": "pending",
        "confidence": 87,
    },
    "req-3": {
        "id": "req-3",
        "merchant": "Dell Technologies",
        "item": "PowerEdge R750 Rack Server",
        "amount": 8500,
        "amount_cents": 850000,
        "time": "32 min ago",
        "reason": "High-value purchase exceeds $5,000 threshold. Quorum required.",
        "status": "pending",
        "confidence": 60,
    },
}

_APPROVAL_QUEUE: Dict[str, dict] = {}


def _load_approvals():
    global _APPROVAL_QUEUE
    if os.path.exists(_STORE_PATH):
        try:
            with open(_STORE_PATH, "r", encoding="utf-8") as f:
                _APPROVAL_QUEUE = json.load(f)
                return
        except Exception as e:
            print(f"Warning: Failed to load {_STORE_PATH}: {e}")
    # Fallback to seed
    _APPROVAL_QUEUE = json.loads(json.dumps(_INITIAL_SEED))
    _save_approvals()


def _save_approvals():
    try:
        with open(_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(_APPROVAL_QUEUE, f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save {_STORE_PATH}: {e}")


def add_to_approval_queue(item: dict) -> str:
    """Adds a new escalated request to the persistent queue."""
    req_id = item.get("id") or f"req_{len(_APPROVAL_QUEUE) + 1}"
    item["id"] = req_id
    if "amount" not in item and "amount_cents" in item:
        item["amount"] = item["amount_cents"] / 100.0
    if "amount_cents" not in item and "amount" in item:
        item["amount_cents"] = int(item["amount"] * 100)
    if "status" not in item:
        item["status"] = "pending"
    _APPROVAL_QUEUE[req_id] = item
    _save_approvals()
    return req_id


# Initialize on import
_load_approvals()


class SubmitApprovalRequest(BaseModel):
    id: Optional[str] = None
    merchant: str
    item: str
    amount: Optional[float] = None
    amount_cents: Optional[int] = None
    reason: Optional[str] = "Escalated for manager approval"
    category: Optional[str] = "General"


@router.post("")
@router.post("/submit")
async def submit_approval_request(
    payload: SubmitApprovalRequest,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER, Role.SYSTEM_AGENT])),
):
    """Adds a new purchase request into the persistent human-in-the-loop approval queue."""
    amount = payload.amount if payload.amount is not None else ((payload.amount_cents or 0) / 100.0)
    amount_cents = payload.amount_cents if payload.amount_cents is not None else int(amount * 100)
    req_id = payload.id or f"appr_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    item = {
        "id": req_id,
        "merchant": payload.merchant,
        "item": payload.item,
        "amount": amount,
        "amount_cents": amount_cents,
        "reason": payload.reason or "Escalated for manager approval",
        "category": payload.category or "General",
        "time": "Just now",
        "status": "pending",
        "confidence": 88,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _APPROVAL_QUEUE[req_id] = item
    _save_approvals()
    return {"status": "success", "data": item}


@router.get("/queue")
async def get_approval_queue(
    skip: int = 0,
    limit: int = 100,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER, Role.SYSTEM_AGENT])),
):
    """Returns all items in the persistent approval queue."""
    return {"data": list(_APPROVAL_QUEUE.values())}


@router.post("/{approval_id}/approve")
async def approve(
    approval_id: str,
    payload: Optional[ApproveRequest] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER, Role.SYSTEM_AGENT])),
):
    """
    Manager approves an escalated transaction.
    Triggers payment gateway, records to audit hash chain, and updates persistent store.
    """
    req = _APPROVAL_QUEUE.get(approval_id)
    if not req:
        # Dynamically register pending approval if submitted from frontend demo or chat
        amount = payload.amount_cents if (payload and payload.amount_cents) else 29997
        merchant = payload.merchant if (payload and payload.merchant) else "Vendor"
        req = {
            "id": approval_id,
            "amount_cents": amount,
            "merchant": merchant,
            "status": "pending",
        }
        _APPROVAL_QUEUE[approval_id] = req

    current_status = str(req.get("status", "")).lower()
    if current_status not in ["pending", "escalate"]:
        raise HTTPException(status_code=400, detail="Request already processed")

    amount_cents = req.get("amount_cents")
    if amount_cents is None:
        amount_cents = int(req.get("amount", 0) * 100)

    gateway = PaymentGatewayFactory.get_gateway()
    try:
        # Fulfill the order via PayPal Orders v2 Sandbox
        intent = await gateway.create_intent(
            amount_cents=amount_cents,
            currency="USD",
            reference_id=f"approved_{approval_id}",
            idempotency_key=idempotency_key or f"idem_appr_{approval_id}",
        )

        resolved_at = datetime.now(timezone.utc).isoformat()
        paypal_order_data = intent.model_dump() if hasattr(intent, "model_dump") else intent
        paypal_id = getattr(intent, "id", None) or (
            paypal_order_data.get("id") if isinstance(paypal_order_data, dict) else f"PAYPAL-SBX-{approval_id}"
        )

        req["status"] = "approved"
        req["resolved_at"] = resolved_at
        req["paypal_order_id"] = paypal_id
        req["paypal_order"] = paypal_order_data
        _save_approvals()

        # Synchronize approved order into completed transactions ledger
        try:
            from apps.api.src.routes.v1.endpoints.transactions import record_completed_approval

            record_completed_approval(req, paypal_id)
        except Exception as e:
            print(f"Warning: Failed to sync completed transaction: {e}")

        # Write to immutable audit hash chain
        try:
            global_audit_chain.add_record(
                {
                    "event": "APPROVAL_AUTHORIZED",
                    "approval_id": approval_id,
                    "merchant": req.get("merchant"),
                    "amount": req.get("amount") or (amount_cents / 100.0),
                    "status": "APPROVED",
                    "paypal_order_id": paypal_id,
                    "timestamp": resolved_at,
                }
            )
        except Exception:
            pass

        return {
            "status": "success",
            "message": "Transaction approved and payment initiated.",
            "data": req,
            "intent": paypal_order_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{approval_id}/deny")
async def deny(
    approval_id: str,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER, Role.SYSTEM_AGENT])),
):
    """Firmly denies an escalated purchase request and saves status to disk."""
    if approval_id not in _APPROVAL_QUEUE:
        _APPROVAL_QUEUE[approval_id] = {"id": approval_id, "status": "blocked"}

    req = _APPROVAL_QUEUE[approval_id]
    resolved_at = datetime.now(timezone.utc).isoformat()
    req["status"] = "blocked"
    req["resolved_at"] = resolved_at
    _save_approvals()

    try:
        from apps.api.src.routes.v1.endpoints import transactions as tx_mod

        for t in tx_mod._TRANSACTIONS:
            if t.get("approval_id") == approval_id or t.get("id") == approval_id:
                t["status"] = "DENIED"
                tx_mod._save_transactions()
                break
    except Exception:
        pass

    try:
        global_audit_chain.add_record(
            {
                "event": "APPROVAL_DENIED",
                "approval_id": approval_id,
                "merchant": req.get("merchant"),
                "amount": req.get("amount"),
                "status": "BLOCKED",
                "timestamp": resolved_at,
            }
        )
    except Exception:
        pass

    return {"status": "success", "message": "Transaction firmly denied.", "data": req}


@router.post("/reset")
async def reset_approval_queue(
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER, Role.SYSTEM_AGENT])),
):
    """Resets the approval queue back to the original seed for demos."""
    global _APPROVAL_QUEUE
    _APPROVAL_QUEUE = json.loads(json.dumps(_INITIAL_SEED))
    _save_approvals()
    return {
        "status": "success",
        "message": "Approval queue reset to initial state.",
        "data": list(_APPROVAL_QUEUE.values()),
    }
