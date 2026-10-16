from datetime import datetime, timezone
from typing import Any

from apps.api.src.services.policy.engine import evaluate
from packages.database.mandate import MandateState
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from packages.database.verdict import Decision, Verdict

# Dummy catalog for testing/mocking
CATALOG = {
    "auralis-nc7": {"id": "auralis-nc7", "name": "Auralis NC-7", "price": 13900, "merchant": "B&H Photo", "category": "Electronics"},
    "graphite-68": {"id": "graphite-68", "name": "Graphite 68 Keyboard", "price": 12900, "merchant": "Keyworks", "category": "Electronics"},
    "gift-card-001": {"id": "gift-card-001", "name": "Digital Gift Card", "price": 10000, "merchant": "Unknown vendor", "category": "Gift Cards"}
}

def search_products(query: str, filters: dict = None) -> list[dict[str, Any]]:
    """Mock implementation of search across verified catalog."""
    query_lower = query.lower()
    matches = [p for p in CATALOG.values() if query_lower in p["name"].lower() or query_lower in p["category"].lower()]
    return matches if matches else list(CATALOG.values())

def compare_products(ids: list[str]) -> list[dict[str, Any]]:
    """Compares multiple products by catalog identifier."""
    return [CATALOG[pid] for pid in ids if pid in CATALOG]

def check_budget(mandate: MandateState, spend_state: SpendState) -> dict[str, Any]:
    """Inspects remaining capital, daily caps, and velocity limits for the current mandate."""
    remaining_monthly = max(0, mandate.monthly_cap_amount - spend_state.current_monthly_spend)
    remaining_daily = max(0, mandate.rules.daily_amount_cap - spend_state.current_daily_spend)
    remaining_transactions = max(0, mandate.rules.daily_purchase_count_cap - spend_state.daily_purchase_count)
    return {
        "monthly_cap_cents": mandate.monthly_cap_amount,
        "remaining_monthly_cents": remaining_monthly,
        "daily_cap_cents": mandate.rules.daily_amount_cap,
        "remaining_daily_cents": remaining_daily,
        "auto_approve_limit_cents": mandate.rules.auto_approve_limit,
        "remaining_transactions_today": remaining_transactions,
        "currency": "USD",
        "is_active": mandate.is_active,
        "kill_switch_engaged": mandate.kill_switch_engaged
    }

def search_handbook(query: str, mandate: MandateState | None = None) -> list[dict[str, Any]]:
    """Searches corporate purchasing policy handbook rules and guidelines."""
    handbook_entries = [
        {"section": "MND-LIM-012", "topic": "Electronics Threshold", "content": "Electronics purchases up to $150.00 qualify for automated approval when from verified merchants."},
        {"section": "MND-MER-021", "topic": "Merchant Verification", "content": "Unverified or first-time merchant transactions must escalate to a human manager for multi-sig approval."},
        {"section": "MND-CAT-003", "topic": "Excluded Categories", "content": "Apparel, luxury items, gambling, and unverified gift cards are strictly prohibited by deterministic policy."},
        {"section": "MND-VEL-009", "topic": "Anti-Structuring", "content": "Multiple purchases clustered near the auto-approval threshold within 24 hours are blocked as structuring evasion attacks."},
        {"section": "MND-SEC-015", "topic": "Kill Switch Protocol", "content": "Any agent dropping below 30% dynamic trust score is instantly quarantined from payment execution."}
    ]
    query_lower = query.lower()
    matches = [entry for entry in handbook_entries if any(w in entry["topic"].lower() or w in entry["content"].lower() for w in query_lower.split())]
    return matches if matches else handbook_entries[:2]

def delegate_task(task_description: str, target_role: str) -> dict[str, Any]:
    """Delegates a procurement subtask to a lower-privilege agent under strict RBAC constraints."""
    valid_roles = ["MANAGER", "EMPLOYEE", "GUEST"]
    if target_role not in valid_roles:
        return {"status": "error", "message": f"Invalid delegation target: {target_role}"}
    return {
        "status": "delegated",
        "task": task_description,
        "assigned_to": target_role,
        "rbac_boundary_applied": True
    }

from sqlalchemy import select

from apps.api.src.services.payments.factory import PaymentGatewayFactory
from packages.database.db.models import Mandate, SpendLedger
from packages.database.db.session import async_session


async def propose_purchase(
    product_id: str, 
    quantity: int, 
    justification: str, 
    mandate: MandateState, 
    spend_state: SpendState
) -> Decision:
    """
    Creates a Proposal record and immediately evaluates it through the policy engine.
    Notice: the agent cannot call PayPal, it only gets a policy verdict back.
    """
    product = CATALOG.get(product_id)
    if not product:
        # Output check: mismatch -> BLOCK
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="SYS-CATALOG-MISMATCH",
            reason=f"Blocked: Product ID {product_id} not found in verified catalog."
        )
    
    total_amount = float(str(product["price"])) * quantity
    
    proposal = ProposalState(
        id=f"prop-{int(datetime.now().timestamp())}",
        amount=total_amount,
        currency="USD",
        merchant=product["merchant"],
        category=product["category"],
        ml_risk_score=0.1 # Real implementation would evaluate `justification` string via ML
    )
    
    # Enforce concurrency using database transactions to prevent spend-limit race conditions.
    async with async_session() as session, session.begin():
        # In a real setup we use the mandate's ID. Fallback to 1 for mock execution.
        m_id = getattr(mandate, 'id', 1)
        
        # Acquire an exclusive row lock on the Mandate to serialize concurrent purchases
        # ensuring spend limit cannot be exceeded via race condition
        await session.execute(
            select(Mandate).where(Mandate.id == m_id).with_for_update()
        )
        
        decision = evaluate(mandate, proposal, spend_state, datetime.now(timezone.utc))
        
        if decision.verdict == Verdict.APPROVE:
            # Deduct from ledger
            new_ledger = SpendLedger(
                mandate_id=m_id,
                amount=int(total_amount),
                currency=proposal.currency,
                balance_after=spend_state.current_monthly_spend + int(total_amount)
            )
            session.add(new_ledger)
            
            gateway = PaymentGatewayFactory.get_gateway()
            intent = await gateway.create_intent(
                amount_cents=int(total_amount),
                currency=proposal.currency,
                reference_id=proposal.id
            )
            # Attach the payment intent details to the decision
            if not hasattr(decision, "details") or decision.details is None:
                decision.details = {}
            decision.details["payment_intent"] = intent.model_dump()
                
    return decision


import sqlite3


def execute_sql_query(query: str) -> dict:
    conn = sqlite3.connect(':memory:')
    cursor = conn.cursor()
    
    # Setup schema
    cursor.execute('''
        CREATE TABLE audit_logs (
            id TEXT PRIMARY KEY,
            merchant TEXT,
            category TEXT,
            amount REAL,
            verdict TEXT,
            rule_id TEXT,
            occurred_at TEXT
        )
    ''')
    
    # Seed data
    mock_data = [
        ('evt_001', 'Amazon', 'Electronics', 120.0, 'APPROVE', 'NONE', '2026-10-01T10:00:00Z'),
        ('evt_002', 'B&H Photo', 'Electronics', 500.0, 'BLOCK', 'MND-SW-104', '2026-10-02T11:00:00Z'),
        ('evt_003', 'Figma', 'Software', 45.0, 'APPROVE', 'NONE', '2026-10-03T09:30:00Z'),
        ('evt_004', 'Flight Club', 'Apparel', 350.0, 'BLOCK', 'MND-CAT-003', '2026-10-04T15:20:00Z'),
        ('evt_005', 'Notion', 'Software', 325.0, 'BLOCK', 'MND-CAT-003', '2026-10-05T08:15:00Z'),
    ]
    cursor.executemany('INSERT INTO audit_logs VALUES (?, ?, ?, ?, ?, ?, ?)', mock_data)
    
    try:
        cursor.execute(query)
        columns = [description[0] for description in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        return {'columns': columns, 'rows': rows}
    except Exception as e:
        return {'error': str(e)}
    finally:
        conn.close()
