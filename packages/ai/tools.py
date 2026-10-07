from typing import List, Dict, Any
from packages.database.verdict import Verdict, Decision
from packages.database.proposal import ProposalState
from packages.database.mandate import MandateState
from packages.database.spend_state import SpendState
from apps.api.src.services.policy.engine import evaluate
from datetime import datetime, timezone

# Dummy catalog for testing/mocking
CATALOG = {
    "auralis-nc7": {"id": "auralis-nc7", "name": "Auralis NC-7", "price": 13900, "merchant": "B&H Photo", "category": "Electronics"},
    "graphite-68": {"id": "graphite-68", "name": "Graphite 68 Keyboard", "price": 12900, "merchant": "Keyworks", "category": "Electronics"},
    "gift-card-001": {"id": "gift-card-001", "name": "Digital Gift Card", "price": 10000, "merchant": "Unknown vendor", "category": "Gift Cards"}
}

def search_products(query: str, filters: dict = None) -> List[Dict[str, Any]]:
    # Mock implementation of search
    return list(CATALOG.values())

def compare_products(ids: List[str]) -> List[Dict[str, Any]]:
    return [CATALOG[pid] for pid in ids if pid in CATALOG]

def propose_purchase(
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
    
    total_amount = product["price"] * quantity
    
    proposal = ProposalState(
        id=f"prop-{int(datetime.now().timestamp())}",
        amount=total_amount,
        currency="USD",
        merchant=product["merchant"],
        category=product["category"],
        ml_risk_score=0.1 # Real implementation would evaluate `justification` string via ML
    )
    
    return evaluate(mandate, proposal, spend_state, datetime.now(timezone.utc))


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
