import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from packages.database.hash_chain import global_audit_chain
from packages.database.mandate import MandateState, RuleConfig
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from packages.database.verdict import Verdict
from pydantic import BaseModel, Field

from apps.api.src.routes.v1.endpoints.approvals import add_to_approval_queue
from apps.api.src.routes.v1.endpoints.mandates import _MOCK_MANDATES
from apps.api.src.services.auth import Principal, Role, get_current_principal, require_roles
from apps.api.src.services.payments.factory import PaymentGatewayFactory
from apps.api.src.services.paypal.client import paypal_client
from apps.api.src.services.paypal.errors import PayPalAPIError
from apps.api.src.services.paypal.orders import (
    build_checkout_return_urls,
    extract_capture_info,
    extract_frontend_origin,
    extract_paypal_issue,
)
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


def _find_transaction(tx_id: str, order_id: Optional[str] = None) -> Optional[dict]:
    candidates = {c for c in (tx_id, order_id) if c}
    for tx in _TRANSACTIONS:
        tx_order = tx.get("paypal_order") if isinstance(tx.get("paypal_order"), dict) else {}
        keys = {
            tx.get("id"),
            tx.get("approval_id"),
            tx.get("paypal_order_id"),
            tx.get("paypal_capture_id"),
            tx_order.get("id"),
        }
        if candidates & keys:
            return tx
    return None


def _derive_payment_status(tx: dict) -> Optional[str]:
    if tx.get("payment_status"):
        return tx["payment_status"]
    if tx.get("paypal_capture_id"):
        return "COMPLETED"
    return tx.get("status")


def _get_paypal_order_id(tx: dict) -> Optional[str]:
    if tx.get("paypal_order_id"):
        return tx["paypal_order_id"]
    po = tx.get("paypal_order")
    if isinstance(po, dict):
        return po.get("id")
    return None


_GLOBAL_SPEND_STATE = SpendState(
    current_monthly_spend=15000,
    daily_purchase_count=1,
    current_daily_spend=15000,
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
    Transaction only moves to payment_status=COMPLETED once payment is captured.
    """
    prop_id = req.get("proposal_id") or req.get("id")
    match = next(
        (t for t in _TRANSACTIONS if t.get("id") == prop_id or t.get("approval_id") == req.get("id")),
        None,
    )

    now = datetime.now(timezone.utc).isoformat()
    resolved_order_id = intent_id or req.get("paypal_order_id")
    if match:
        match["status"] = "PENDING_PAYMENT"
        match["payment_status"] = "PENDING_PAYMENT"
        match["verdict"] = "AUTHORIZED"
        match["paypal_order_id"] = resolved_order_id
        if isinstance(req.get("paypal_order"), dict):
            match["paypal_order"] = req["paypal_order"]
        match["resolved_at"] = req.get("resolved_at") or now
        match["reason"] = "Authorized by Manager via Human Approval Center. Awaiting PayPal Sandbox payment capture."
    else:
        amount_cents = req.get("amount_cents")
        if amount_cents is None:
            amount_cents = round(req.get("amount", 0) * 100)
        _TRANSACTIONS.insert(
            0,
            {
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
                "paypal_order_id": resolved_order_id or f"PAYPAL-SBX-{req.get('id')}",
                "paypal_order": req.get("paypal_order"),
                "status": "PENDING_PAYMENT",
                "payment_status": "PENDING_PAYMENT",
                "spend_recorded": False,
                "approval_id": req.get("id"),
            },
        )
    _save_transactions()


@router.get("/")
async def list_transactions(
    skip: int = 0,
    limit: int = 100,
    principal: Principal = Depends(get_current_principal),
):
    # Sanitized transaction list: exposes only public audit and receipt data.
    # Shields internal PayPal credentials, private tokens, and sensitive headers.
    sanitized = []
    for tx in _TRANSACTIONS[skip : skip + limit]:
        sanitized.append(
            {
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
                "payment_status": _derive_payment_status(tx),
                "timestamp": tx.get("timestamp"),
                "approval_id": tx.get("approval_id"),
                "paypal_order_id": _get_paypal_order_id(tx),
                "paypal_capture_id": tx.get("paypal_capture_id"),
                "refunded_cents": tx.get("refunded_cents", 0),
            }
        )
    return {"data": sanitized}


@router.post("/reset-spend")
async def reset_spend(principal: Principal = Depends(get_current_principal)):
    _GLOBAL_SPEND_STATE.current_daily_spend = 0
    _GLOBAL_SPEND_STATE.daily_purchase_count = 0
    _GLOBAL_SPEND_STATE.current_monthly_spend = 0
    return {
        "status": "success",
        "message": "Spend counters reset to zero.",
        "spend_state": _GLOBAL_SPEND_STATE.model_dump(),
    }


@router.post("/propose")
async def propose_transaction(
    payload: ProposeTransactionRequest,
    request: Request,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    principal: Principal = Depends(get_current_principal),
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
            rules=RuleConfig(auto_approve_limit=15000),
        )
        _MOCK_MANDATES[payload.mandate_id] = mandate

    prop_id = f"prop_{uuid.uuid4().hex[:8]}"
    proposal = ProposalState(
        id=prop_id,
        amount=payload.amount_cents,
        currency=payload.currency or "USD",
        merchant=payload.merchant,
        category=payload.category or "General",
        ml_risk_score=0.0,
    )

    now = datetime.now(timezone.utc)
    decision = evaluate(mandate, proposal, _GLOBAL_SPEND_STATE, now)

    tx_record = {
        "id": prop_id,
        "amount_cents": payload.amount_cents,
        "merchant": payload.merchant,
        "category": payload.category,
        "currency": payload.currency or "USD",
        "description": payload.description,
        "verdict": decision.verdict.value,
        "rule_id": decision.rule_id,
        "reason": decision.reason,
        "audit_hash": decision.audit_hash,
        "trust_score_after": mandate.trust_score,
        "timestamp": now.isoformat(),
        "paypal_order": None,
        "paypal_order_id": None,
        "status": (
            "COMPLETED"
            if decision.verdict == Verdict.APPROVE
            else ("PENDING_APPROVAL" if decision.verdict == Verdict.ESCALATE else "BLOCKED")
        ),
        "payment_status": (
            "PENDING_PAYMENT"
            if decision.verdict == Verdict.APPROVE
            else ("PENDING_APPROVAL" if decision.verdict == Verdict.ESCALATE else "BLOCKED")
        ),
        "spend_recorded": False,
    }

    gateway = PaymentGatewayFactory.get_gateway()
    paypal_order = None

    if decision.verdict == Verdict.APPROVE:
        # Update spend tracking
        _GLOBAL_SPEND_STATE.current_monthly_spend += payload.amount_cents
        _GLOBAL_SPEND_STATE.current_daily_spend += payload.amount_cents
        _GLOBAL_SPEND_STATE.daily_purchase_count += 1
        tx_record["spend_recorded"] = True

        frontend_origin = extract_frontend_origin(request.headers)
        return_url, cancel_url = build_checkout_return_urls(frontend_origin)

        try:
            intent = await gateway.create_intent(
                amount_cents=payload.amount_cents,
                currency=payload.currency or "USD",
                reference_id=prop_id,
                idempotency_key=idempotency_key or f"prop_idem_{prop_id}",
                return_url=return_url,
                cancel_url=cancel_url,
            )
            paypal_order = intent.model_dump()
            tx_record["paypal_order"] = paypal_order
            tx_record["paypal_order_id"] = intent.id
        except Exception as e:
            tx_record["paypal_error"] = str(e)

    elif decision.verdict == Verdict.ESCALATE:
        approval_id = f"appr_{uuid.uuid4().hex[:8]}"
        add_to_approval_queue(
            {
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
                "timestamp": now.isoformat(),
            }
        )
        tx_record["approval_id"] = approval_id

        # Trigger Human-in-the-Loop notification via Slack if configured
        try:
            slack = SlackHITLService()
            await slack.request_approval(
                transaction_id=prop_id,
                amount=payload.amount_cents / 100.0,
                merchant=payload.merchant,
                reason=decision.reason,
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
        "transaction": tx_record,
    }


class CompleteTxRequest(BaseModel):
    paypal_order_id: Optional[str] = None
    amount_cents: Optional[int] = None
    merchant: Optional[str] = None
    description: Optional[str] = None


@router.post("/{tx_id}/complete")
async def complete_transaction(
    tx_id: str,
    payload: Optional[CompleteTxRequest] = None,
    principal: Principal = Depends(get_current_principal),
):
    """
    Captures an approved PayPal Sandbox order via Orders v2 API and marks the
    transaction as COMPLETED and settled in the ledger.
    """
    requested_order_id = payload.paypal_order_id if (payload and payload.paypal_order_id) else None
    target = _find_transaction(tx_id, requested_order_id)

    approval_record = None
    try:
        from apps.api.src.routes.v1.endpoints.approvals import _APPROVAL_QUEUE

        for app_id, app_req in _APPROVAL_QUEUE.items():
            if (
                app_id == tx_id
                or app_req.get("proposal_id") == tx_id
                or (requested_order_id and app_req.get("paypal_order_id") == requested_order_id)
                or app_req.get("paypal_order_id") == tx_id
                or (target and app_id == target.get("approval_id"))
            ):
                approval_record = app_req
                break
    except Exception:
        pass

    order_id = (
        requested_order_id
        or (_get_paypal_order_id(target) if target else None)
        or (approval_record.get("paypal_order_id") if approval_record else None)
        or tx_id
    )

    if not order_id or order_id.startswith("PAYPAL-SBX-"):
        raise HTTPException(
            status_code=400,
            detail="Transaction does not have a valid PayPal Sandbox order ID to capture.",
        )

    if order_id.startswith("MOCK-") and not paypal_client.mock_mode:
        raise HTTPException(
            status_code=400,
            detail="Cannot capture a mock PayPal order while the backend is in live Sandbox mode.",
        )

    gateway = PaymentGatewayFactory.get_gateway()
    capture_id: Optional[str] = target.get("paypal_capture_id") if target else None
    captured_intent = None
    captured_amt_cents: Optional[int] = None
    captured_currency = "USD"

    already_captured_locally = bool(
        target and _derive_payment_status(target) == "COMPLETED" and capture_id
    )

    if not already_captured_locally:
        try:
            captured_intent = await gateway.capture_intent(order_id)
        except PayPalAPIError as e:
            issue, desc = extract_paypal_issue(e)
            # Check if the order was already captured (idempotent return) or still unapproved
            try:
                existing = await gateway.get_intent(order_id)
                if existing.status == "COMPLETED":
                    captured_intent = existing
                elif existing.status in ("CREATED", "PAYER_ACTION_REQUIRED") or issue == "ORDER_NOT_APPROVED":
                    raise HTTPException(
                        status_code=409,
                        detail="PayPal order has not been approved by the buyer yet. Complete checkout in PayPal Sandbox first.",
                    ) from e
                elif issue == "COMPLIANCE_VIOLATION":
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"PayPal Sandbox declined capture for order {order_id} "
                            f"(COMPLIANCE_VIOLATION, debug_id={e.debug_id}): {desc} "
                            "Use a US Sandbox Business + US Personal buyer pair in PayPal Developer Dashboard, "
                            "ensure Negative Testing is Off, and approve a fresh order."
                        ),
                    ) from e
                else:
                    status_code = e.status_code if 400 <= e.status_code < 500 else 502
                    raise HTTPException(
                        status_code=status_code,
                        detail=desc or str(e),
                    ) from e
            except HTTPException:
                raise
            except Exception:
                if issue == "ORDER_NOT_APPROVED":
                    raise HTTPException(
                        status_code=409,
                        detail="PayPal order has not been approved by the buyer yet. Complete checkout in PayPal Sandbox first.",
                    ) from e
                if issue == "COMPLIANCE_VIOLATION":
                    raise HTTPException(
                        status_code=422,
                        detail=(
                            f"PayPal Sandbox declined capture for order {order_id} "
                            f"(COMPLIANCE_VIOLATION, debug_id={e.debug_id}): {desc} "
                            "Use a US Sandbox Business + US Personal buyer pair in PayPal Developer Dashboard, "
                            "ensure Negative Testing is Off, and approve a fresh order."
                        ),
                    ) from e
                status_code = e.status_code if 400 <= e.status_code < 500 else 502
                raise HTTPException(status_code=status_code, detail=desc or str(e)) from e
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"PayPal capture failed: {str(e)}") from e

        if captured_intent is not None:
            capture_id, captured_amt_cents, captured_currency = extract_capture_info(
                captured_intent.provider_raw
            )
            if not captured_amt_cents and captured_intent.amount_cents:
                captured_amt_cents = captured_intent.amount_cents

    now_iso = datetime.now(timezone.utc).isoformat()
    if not target:
        amt = (
            (payload.amount_cents if payload and payload.amount_cents else None)
            or (approval_record.get("amount_cents") if approval_record else None)
            or captured_amt_cents
            or 0
        )
        merch = (
            (payload.merchant if payload and payload.merchant else None)
            or (approval_record.get("merchant") if approval_record else None)
            or "PayPal Sandbox Merchant"
        )
        desc = (
            (payload.description if payload and payload.description else None)
            or (approval_record.get("item") if approval_record else None)
            or f"PayPal Sandbox Checkout ({order_id})"
        )
        target = {
            "id": tx_id,
            "amount_cents": amt,
            "merchant": merch,
            "category": (approval_record.get("category") if approval_record else None) or "General",
            "currency": captured_currency or "USD",
            "description": desc,
            "verdict": "APPROVE",
            "rule_id": "MND-LIM-012",
            "reason": "Payment successfully authorized and captured via PayPal Sandbox.",
            "audit_hash": uuid.uuid4().hex,
            "trust_score_after": 100.0,
            "timestamp": now_iso,
            "status": "COMPLETED",
            "payment_status": "COMPLETED",
            "paypal_order_id": order_id,
            "paypal_capture_id": capture_id,
            "paypal_order": captured_intent.model_dump() if captured_intent else {"id": order_id},
            "spend_recorded": False,
        }
        if approval_record and approval_record.get("id"):
            target["approval_id"] = approval_record["id"]
        _TRANSACTIONS.insert(0, target)
    else:
        target["status"] = "COMPLETED"
        target["payment_status"] = "COMPLETED"
        target["verdict"] = "APPROVE"
        target["reason"] = "Payment successfully authorized and captured via PayPal Sandbox."
        target["paypal_order_id"] = order_id
        if capture_id:
            target["paypal_capture_id"] = capture_id
        if captured_intent:
            target["paypal_order"] = captured_intent.model_dump()
        elif not target.get("paypal_order"):
            target["paypal_order"] = {"id": order_id}
        if (not target.get("amount_cents")) and captured_amt_cents:
            target["amount_cents"] = captured_amt_cents

    amt = target.get("amount_cents") or 0
    if not target.get("spend_recorded") and amt > 0:
        _GLOBAL_SPEND_STATE.current_monthly_spend += amt
        _GLOBAL_SPEND_STATE.current_daily_spend += amt
        _GLOBAL_SPEND_STATE.daily_purchase_count += 1
        target["spend_recorded"] = True

    # Mark payment completed in persistent approvals store if linked
    try:
        from apps.api.src.routes.v1.endpoints.approvals import _APPROVAL_QUEUE, _save_approvals

        for app_id, app_req in _APPROVAL_QUEUE.items():
            if (
                app_id == tx_id
                or app_req.get("proposal_id") == tx_id
                or app_req.get("paypal_order_id") == order_id
                or app_req.get("paypal_order_id") == tx_id
                or app_id == target.get("approval_id")
            ):
                app_req["payment_completed"] = True
                if capture_id:
                    app_req["paypal_capture_id"] = capture_id
                _save_approvals()
                break
    except Exception:
        pass

    try:
        global_audit_chain.add_record(
            {
                "event": "PAYMENT_CAPTURED",
                "transaction_id": target.get("id"),
                "merchant": target.get("merchant"),
                "amount": amt / 100.0,
                "verdict": "APPROVE",
                "status": "COMPLETED",
                "paypal_order_id": order_id,
                "paypal_capture_id": capture_id,
                "timestamp": now_iso,
            }
        )
    except Exception:
        pass

    _save_transactions()
    return {
        "status": "success",
        "message": "Transaction captured and settled via PayPal.",
        "order_id": order_id,
        "capture_id": capture_id,
        "transaction": target,
    }


class RefundTxRequest(BaseModel):
    amount_cents: Optional[int] = None
    currency: Optional[str] = None


@router.post("/{tx_id}/refund")
async def refund_transaction(
    tx_id: str,
    payload: Optional[RefundTxRequest] = None,
    amount_cents: Optional[int] = None,
    currency: Optional[str] = "USD",
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER])),
):
    """
    Refunds a captured PayPal payment. Resolves the underlying PayPal capture ID
    from either the local ledger or live PayPal Order lookup when invoked with an order ID.
    """
    refund_amount_cents = payload.amount_cents if (payload and payload.amount_cents is not None) else amount_cents
    refund_currency = (payload.currency if (payload and payload.currency) else currency) or "USD"

    target = _find_transaction(tx_id)
    gateway = PaymentGatewayFactory.get_gateway()

    capture_id: Optional[str] = target.get("paypal_capture_id") if target else None
    if not capture_id and target and isinstance(target.get("paypal_order"), dict):
        raw_order = target["paypal_order"].get("provider_raw") or target["paypal_order"]
        if isinstance(raw_order, dict):
            capture_id, _, raw_cur = extract_capture_info(raw_order)
            if raw_cur:
                refund_currency = raw_cur

    order_id = _get_paypal_order_id(target) if target else tx_id
    if not capture_id and order_id:
        try:
            order_intent = await gateway.get_intent(order_id)
            capture_id, _, order_currency = extract_capture_info(order_intent.provider_raw)
            if order_currency and not (payload and payload.currency):
                refund_currency = order_currency
            if not capture_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"PayPal order {order_id} has not been captured yet (status={order_intent.status}). Capture payment before refunding.",
                )
            if target and capture_id:
                target["paypal_capture_id"] = capture_id
        except HTTPException:
            raise
        except PayPalAPIError as e:
            if target is None and e.status_code == 404:
                # Caller may have passed a raw PayPal capture ID directly
                capture_id = tx_id
            else:
                _, desc = extract_paypal_issue(e)
                status_code = e.status_code if 400 <= e.status_code < 500 else 502
                raise HTTPException(status_code=status_code, detail=desc or str(e)) from e

    if not capture_id:
        raise HTTPException(
            status_code=400,
            detail="No PayPal capture ID found for this transaction. Capture payment before refunding.",
        )

    try:
        refund_response = await gateway.refund(
            capture_id=capture_id,
            amount_cents=refund_amount_cents,
            currency=refund_currency,
            idempotency_key=idempotency_key,
        )
    except PayPalAPIError as e:
        _, desc = extract_paypal_issue(e)
        status_code = e.status_code if 400 <= e.status_code < 500 else 502
        raise HTTPException(status_code=status_code, detail=desc or str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    if target:
        total_cents = target.get("amount_cents") or 0
        applied_cents = refund_amount_cents if refund_amount_cents is not None else total_cents
        new_refunded = (target.get("refunded_cents") or 0) + applied_cents
        target["refunded_cents"] = new_refunded
        if total_cents > 0 and new_refunded >= total_cents:
            target["payment_status"] = "REFUNDED"
            target["status"] = "REFUNDED"
        _save_transactions()

    return {
        "status": "success",
        "capture_id": capture_id,
        "refund": refund_response,
        "transaction": target,
    }
