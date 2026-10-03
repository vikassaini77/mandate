from typing import List, Dict, Any
from app.domain.verdict import Verdict, Decision
from app.domain.proposal import ProposalState
from app.domain.mandate import MandateState
from app.domain.spend_state import SpendState
from app.policy.engine import evaluate
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
