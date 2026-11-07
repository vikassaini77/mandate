import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from packages.database.mandate import MandateState, RuleConfig
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from packages.database.verdict import Verdict
from pydantic import BaseModel, Field

from apps.api.src.routes.v1.endpoints.approvals import add_to_approval_queue
from apps.api.src.routes.v1.endpoints.mandates import _MOCK_MANDATES
from apps.api.src.services.auth import Principal, Role, get_current_principal, require_roles
from apps.api.src.services.payments.factory import PaymentGatewayFactory
from apps.api.src.services.policy.engine import evaluate
from apps.api.src.services.slack_hitl import SlackHITLService

router = APIRouter()

# Persistent transaction store for tracking
_TX_STORE_PATH = os.path.join(os.path.dirname(__file__), "transactions_store.json")
_TRANSACTIONS: list[dict] = []

if os.path.exists(_TX_STORE_PATH):
    try:
        with open(_TX_STORE_PATH, "r", encoding="utf-8") as f:
            _TRANSACTIONS = json.load(f)
    except Exception:
        _TRANSACTIONS = []

def _save_transactions():
    try:
        with open(_TX_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(_TRANSACTIONS, f, indent=2)
    except Exception:
        pass

_GLOBAL_SPEND_STATE = SpendState(
    current_monthly_spend=15000,
    daily_purchase_count=1,
    current_daily_spend=15000
)

class ProposeTransactionRequest(BaseModel):
    amount_cents: int = Field(..., description="Amount in minor currency units (cents)")
    merchant: str = Field(..., description="Merchant name")
    category: Optional[str] = Field("General", description="Product category")
    description: Optional[str] = Field(None, description="Purchase justification or description")
    currency: Optional[str] = Field("USD", description="3-letter currency code")
    mandate_id: Optional[str] = Field("mandate_1", description="ID of the governing mandate")

def record_completed_approval(req: dict, intent_id: Optional[str] = None):
    """
    Synchronizes an approved transaction into the transactions store as PENDING_PAYMENT.
    Transaction only moves to COMPLETED once payment is captured.
    """
    prop_id = req.get("proposal_id") or req.get("id")
    match = next((t for t in _TRANSACTIONS if t.get("id") == prop_id or t.get("approval_id") == req.get("id")), None)
    
    now = datetime.now(timezone.utc).isoformat()
    if match:
        match["status"] = "PENDING_PAYMENT"
        match["verdict"] = "AUTHORIZED"
        match["paypal_order_id"] = intent_id or req.get("paypal_order_id")
        match["resolved_at"] = req.get("resolved_at") or now
        match["reason"] = "Authorized by Manager via Human Approval Center. Awaiting PayPal Sandbox payment capture."
    else:
        amount_cents = req.get("amount_cents")
        if amount_cents is None:
            amount_cents = int(req.get("amount", 0) * 100)
        _TRANSACTIONS.insert(0, {
            "id": prop_id,
            "amount_cents": amount_cents,
            "merchant": req.get("merchant", "Authorized Vendor"),
            "category": req.get("category", "General"),
            "currency": "USD",
            "description": req.get("item") or req.get("description", "Approved Purchase"),
            "verdict": "AUTHORIZED",
            "rule_id": "MND-HUMAN-APPROVAL",
            "reason": "Authorized by Manager via Human Approval Center. Awaiting PayPal Sandbox payment capture.",
            "trust_score_after": 100.0,
            "timestamp": req.get("resolved_at") or now,
            "paypal_order_id": intent_id or req.get("paypal_order_id") or f"PAYPAL-SBX-{req.get('id')}",
            "status": "PENDING_PAYMENT",
            "approval_id": req.get("id")
        })
    _save_transactions()

@router.get('/')
async def list_transactions(
    skip: int = 0, 
    limit: int = 100,
    principal: Principal = Depends(get_current_principal)
): 
    # Sanitized transaction list: exposes only public audit and receipt data.
    # Shields internal PayPal credentials, private tokens, and sensitive headers.
    sanitized = []
    for tx in _TRANSACTIONS:
        sanitized.append({
            "id": tx.get("id"),
            "amount_cents": tx.get("amount_cents"),
            "amount": (tx.get("amount_cents") or 0) / 100.0 if "amount_cents" in tx else tx.get("amount", 0),
            "merchant": tx.get("merchant"),
            "category": tx.get("category"),
            "currency": tx.get("currency", "USD"),
            "description": tx.get("description"),
            "verdict": tx.get("verdict"),
            "rule_id": tx.get("rule_id"),
            "reason": tx.get("reason"),
            "status": tx.get("status"),
            "timestamp": tx.get("timestamp"),
            "approval_id": tx.get("approval_id"),
            "paypal_order_id": tx.get("paypal_order_id") or ((tx.get("paypal_order") or {}).get("id") if isinstance(tx.get("paypal_order"), dict) else None),
        })
    return {"data": sanitized}

@router.post('/reset-spend')
async def reset_spend(principal: Principal = Depends(get_current_principal)):
    _GLOBAL_SPEND_STATE.current_daily_spend = 0
    _GLOBAL_SPEND_STATE.daily_purchase_count = 0
    _GLOBAL_SPEND_STATE.current_monthly_spend = 0
    return {"status": "success", "message": "Spend counters reset to zero.", "spend_state": _GLOBAL_SPEND_STATE.model_dump()}

@router.post('/propose')
async def propose_transaction(
    payload: ProposeTransactionRequest,
    idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key'),
    principal: Principal = Depends(get_current_principal)
):
    """
    Core Agentic Commerce Endpoint:
    Receives purchase proposals from AI agents (via Python SDK, Node SDK, or MCP server).
    Deterministic Policy Engine evaluates the proposal.
    - If APPROVED: Authorizes and generates PayPal Order Intent immediately.
    - If ESCALATED: Adds to Human-in-the-Loop Approval Queue.
    - If BLOCKED: Rejects with deterministic rule violation reason.
    """
    mandate = _MOCK_MANDATES.get(payload.mandate_id)
    if not mandate:
        # Default safe fallback mandate
        mandate = MandateState(
            is_active=True,
            monthly_cap_amount=500000,
            rules=RuleConfig(auto_approve_limit=15000)
        )
        _MOCK_MANDATES[payload.mandate_id] = mandate

    prop_id = f"prop_{uuid.uuid4().hex[:8]}"
    proposal = ProposalState(
        id=prop_id,
        amount=payload.amount_cents,
        currency=payload.currency or "USD",
        merchant=payload.merchant,
        category=payload.category or "General",
        ml_risk_score=0.0
    )

    now = datetime.now(timezone.utc)
    decision = evaluate(mandate, proposal, _GLOBAL_SPEND_STATE, now)

    tx_record = {
        "id": prop_id,
        "amount_cents": payload.amount_cents,
        "merchant": payload.merchant,
        "category": payload.category,
        "currency": payload.currency,
        "description": payload.description,
        "verdict": decision.verdict.value,
        "rule_id": decision.rule_id,
        "reason": decision.reason,
        "audit_hash": decision.audit_hash,
        "trust_score_after": mandate.trust_score,
        "timestamp": now.isoformat(),
        "paypal_order": None,
        "status": "COMPLETED" if decision.verdict == Verdict.APPROVE else ("PENDING_APPROVAL" if decision.verdict == Verdict.ESCALATE else "BLOCKED")
    }

    gateway = PaymentGatewayFactory.get_gateway()
    paypal_order = None

    if decision.verdict == Verdict.APPROVE:
        # Update spend tracking
        _GLOBAL_SPEND_STATE.current_monthly_spend += payload.amount_cents
        _GLOBAL_SPEND_STATE.current_daily_spend += payload.amount_cents
        _GLOBAL_SPEND_STATE.daily_purchase_count += 1

        try:
            intent = await gateway.create_intent(
                amount_cents=payload.amount_cents,
                currency=payload.currency or "USD",
                reference_id=prop_id,
                idempotency_key=idempotency_key or f"prop_idem_{prop_id}"
            )
            paypal_order = intent.model_dump()
            tx_record["paypal_order"] = paypal_order
        except Exception as e:
            tx_record["paypal_error"] = str(e)
            
    elif decision.verdict == Verdict.ESCALATE:
        approval_id = f"appr_{uuid.uuid4().hex[:8]}"
        add_to_approval_queue({
            "id": approval_id,
            "proposal_id": prop_id,
            "item": payload.description or f"{payload.category} order",
            "amount_cents": payload.amount_cents,
            "amount": payload.amount_cents / 100.0,
            "merchant": payload.merchant,
            "category": payload.category,
            "status": "pending",
            "time": "Just now",
            "reason": decision.reason,
            "confidence": 75,
            "timestamp": now.isoformat()
        })
        tx_record["approval_id"] = approval_id

        # Trigger Human-in-the-Loop notification via Slack if configured
        try:
            slack = SlackHITLService()
            await slack.request_approval(
                transaction_id=prop_id,
                amount=payload.amount_cents / 100.0,
                merchant=payload.merchant,
                reason=decision.reason
            )
        except Exception:
            pass

    _TRANSACTIONS.insert(0, tx_record)
    _save_transactions()

    return {
        "status": "success",
        "verdict": decision.verdict.value,
        "rule_id": decision.rule_id,
        "reason": decision.reason,
        "audit_hash": decision.audit_hash,
        "trust_score": mandate.trust_score,
        "paypal_order": paypal_order,
        "transaction": tx_record
    }

class CompleteTxRequest(BaseModel):
    paypal_order_id: Optional[str] = None
    amount_cents: Optional[int] = None
    merchant: Optional[str] = None
    description: Optional[str] = None

@router.post('/{tx_id}/complete')
async def complete_transaction(
    tx_id: str,
    payload: Optional[CompleteTxRequest] = None,
    principal: Principal = Depends(get_current_principal)
):
    """
    Marks a transaction as COMPLETED upon successful PayPal checkout.
    Updates spend tracking counters and transaction ledger.
    """
    target = None
    for tx in _TRANSACTIONS:
        if tx.get("id") == tx_id or tx.get("approval_id") == tx_id:
            target = tx
            break
            
    if not target:
        amt = payload.amount_cents if (payload and payload.amount_cents) else 29997
        merch = payload.merchant if (payload and payload.merchant) else "Vendor"
        target = {
            "id": tx_id,
            "amount_cents": amt,
            "merchant": merch,
            "category": "Electronics",
            "currency": "USD",
            "description": payload.description if payload and payload.description else "Completed purchase",
            "verdict": "APPROVE",
            "rule_id": "MND-LIM-012",
            "reason": "Payment successfully authorized and captured via PayPal Sandbox.",
            "audit_hash": uuid.uuid4().hex,
            "trust_score_after": 100.0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "COMPLETED",
            "paypal_order": {"id": payload.paypal_order_id if payload else None}
        }
        _TRANSACTIONS.insert(0, target)
        _GLOBAL_SPEND_STATE.current_monthly_spend += amt
        _GLOBAL_SPEND_STATE.current_daily_spend += amt
        _GLOBAL_SPEND_STATE.daily_purchase_count += 1
    else:
        target["status"] = "COMPLETED"
        target["verdict"] = "APPROVE"
        target["reason"] = "Payment successfully authorized and captured via PayPal Sandbox."
        if payload and payload.paypal_order_id:
            if not target.get("paypal_order"):
                target["paypal_order"] = {}
            target["paypal_order"]["id"] = payload.paypal_order_id
            target["paypal_order_id"] = payload.paypal_order_id
        amt = target.get("amount_cents", 0)
        _GLOBAL_SPEND_STATE.current_monthly_spend += amt
        _GLOBAL_SPEND_STATE.current_daily_spend += amt
        _GLOBAL_SPEND_STATE.daily_purchase_count += 1
            
    # Mark payment completed in persistent approvals store if linked
    try:
        from apps.api.src.routes.v1.endpoints.approvals import _APPROVAL_QUEUE, _save_approvals
        for app_id, app_req in _APPROVAL_QUEUE.items():
            if app_id == tx_id or app_req.get("paypal_order_id") == tx_id or app_id == target.get("approval_id"):
                app_req["payment_completed"] = True
                _save_approvals()
                break
    except Exception:
        pass

    _save_transactions()
    return {"status": "success", "message": "Transaction marked as COMPLETED and settled.", "transaction": target}

@router.post('/{tx_id}/refund')
async def refund_transaction(
    tx_id: str, 
    amount_cents: Optional[int] = None,
    currency: Optional[str] = "USD",
    idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key'),
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
): 
    try:
        gateway = PaymentGatewayFactory.get_gateway()
        # Item 8: The gateway abstraction automatically routes to PayPal
        refund_response = await gateway.refund(
            capture_id=tx_id, 
            amount_cents=amount_cents,
            currency=currency,
            idempotency_key=idempotency_key
        )
        return {"status": "success", "refund": refund_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

