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

from apps.api.src.routes.v1.endpoints.approvals import _APPROVAL_QUEUE
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

@router.get('/')
async def list_transactions(
    skip: int = 0, 
    limit: int = 100,
    principal: Principal = Depends(get_current_principal)
): 
    return {"data": _TRANSACTIONS}

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
        _APPROVAL_QUEUE[approval_id] = {
            "id": approval_id,
            "proposal_id": prop_id,
            "amount_cents": payload.amount_cents,
            "merchant": payload.merchant,
            "category": payload.category,
            "status": "PENDING",
            "reason": decision.reason,
            "timestamp": now.isoformat()
        }
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

    _TRANSACTIONS.append(tx_record)
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

