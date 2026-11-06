from typing import Dict, Optional
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Header, HTTPException

from apps.api.src.services.auth import Principal, Role, require_roles
from apps.api.src.services.payments.factory import PaymentGatewayFactory

router = APIRouter()

class ApproveRequest(BaseModel):
    amount_cents: Optional[int] = None
    merchant: Optional[str] = None
    category: Optional[str] = "General"

# Mock queue for Demo
_APPROVAL_QUEUE: Dict[str, dict] = {
    "appr_123": {"id": "appr_123", "amount_cents": 250000, "merchant": "Apple", "status": "PENDING"}
}

@router.get('/queue')
async def get_approval_queue(
    skip: int = 0, 
    limit: int = 100,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
): 
    return {"data": list(_APPROVAL_QUEUE.values())}

@router.post('/{approval_id}/approve')
async def approve(
    approval_id: str, 
    payload: Optional[ApproveRequest] = None,
    idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key'),
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    """
    Item 13: Human Approval Center.
    Manager approves an escalated transaction, which asynchronously triggers the payment gateway.
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
            "status": "PENDING"
        }
        _APPROVAL_QUEUE[approval_id] = req

    if req["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Request already processed")
        
    gateway = PaymentGatewayFactory.get_gateway()
    try:
        # Fulfill the order via PayPal Orders v2 Sandbox
        intent = await gateway.create_intent(
            amount_cents=req["amount_cents"],
            currency="USD",
            reference_id=f"approved_{approval_id}",
            idempotency_key=idempotency_key
        )
        req["status"] = "APPROVED"
        req["paypal_order"] = intent.model_dump()

        # Synchronize into backend persistent transactions store
        try:
            from apps.api.src.routes.v1.endpoints import transactions as tx_mod
            found = False
            for t in tx_mod._TRANSACTIONS:
                if t.get("approval_id") == approval_id or t.get("id") == approval_id:
                    t["status"] = "COMPLETED"
                    t["paypal_order"] = intent.model_dump()
                    found = True
                    break
            if not found:
                tx_mod._TRANSACTIONS.insert(0, {
                    "id": f"tx_{uuid.uuid4().hex[:8]}",
                    "amount_cents": req["amount_cents"],
                    "merchant": req["merchant"],
                    "category": payload.category if payload and payload.category else "General",
                    "currency": "USD",
                    "description": f"Approved order {approval_id}",
                    "verdict": "APPROVE",
                    "rule_id": "MND-HITL-001",
                    "reason": "Authorized by manager via Approvals Center.",
                    "audit_hash": uuid.uuid4().hex,
                    "trust_score_after": 100.0,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "COMPLETED",
                    "approval_id": approval_id,
                    "paypal_order": intent.model_dump()
                })
            tx_mod._save_transactions()
        except Exception as sync_err:
            print("Sync to transactions failed:", sync_err)

        return {"status": "success", "message": "Transaction approved and payment initiated.", "intent": intent.model_dump()}  # noqa: E501
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/{approval_id}/deny')
async def deny(
    approval_id: str,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    if approval_id not in _APPROVAL_QUEUE:
        _APPROVAL_QUEUE[approval_id] = {"id": approval_id, "status": "DENIED"}
        return {"status": "success", "message": "Transaction firmly denied."}
        
    _APPROVAL_QUEUE[approval_id]["status"] = "DENIED"

    try:
        from apps.api.src.routes.v1.endpoints import transactions as tx_mod
        for t in tx_mod._TRANSACTIONS:
            if t.get("approval_id") == approval_id or t.get("id") == approval_id:
                t["status"] = "DENIED"
                tx_mod._save_transactions()
                break
    except Exception:
        pass

    return {"status": "success", "message": "Transaction firmly denied."}
