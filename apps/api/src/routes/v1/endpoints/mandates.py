from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from packages.database.hash_chain import global_audit_chain
from packages.database.mandate import MandateState, RuleConfig

from apps.api.src.services.auth import Principal, Role, get_current_principal, require_roles

router = APIRouter()

# Mock global store for the Hackathon/Demo
_MOCK_MANDATES: Dict[str, MandateState] = {
    "mandate_1": MandateState(
        is_active=True,
        monthly_cap_amount=500000,
        rules=RuleConfig(auto_approve_limit=15000)
    )
}

@router.get('/')
async def list_mandates(skip: int = 0, limit: int = 100, principal: Principal = Depends(get_current_principal)):   # noqa: E501
    return {"data": list(_MOCK_MANDATES.keys())}

@router.get('/{mandate_id}')
async def get_mandate(mandate_id: str):
    if mandate_id not in _MOCK_MANDATES:
        raise HTTPException(status_code=404, detail="Mandate not found")
    return _MOCK_MANDATES[mandate_id].model_dump()

@router.post('/{mandate_id}/kill')
async def kill_switch(
    mandate_id: str, 
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    """
    Item 15: Kill Switch. Instantly disables the agent's ability to transact.
    """
    if mandate_id not in _MOCK_MANDATES:
        raise HTTPException(status_code=404, detail="Mandate not found")
        
    mandate = _MOCK_MANDATES[mandate_id]
    mandate.kill_switch_engaged = True
    mandate.is_active = False
    
    return {"status": "success", "message": f"Agent {mandate_id} has been KILLED. All network and payment access revoked."}  # noqa: E501

@router.post('/{mandate_id}/activate')
async def activate_mandate(
    mandate_id: str,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    if mandate_id not in _MOCK_MANDATES:
        raise HTTPException(status_code=404, detail="Mandate not found")
    _MOCK_MANDATES[mandate_id].kill_switch_engaged = False
    _MOCK_MANDATES[mandate_id].is_active = True
    return {"status": "success", "message": f"Agent {mandate_id} is now ACTIVE."}

@router.post('/simulate')
async def simulate_mandate(
    mandate_id: str, 
    payload: dict,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    """
    Item 16: Policy Simulation.
    Dry-runs a proposed mandate config against the historical audit chain to predict impact.
    """
    # Create a dry-run mandate from the payload (e.g. strict limits)
    try:
        test_rules = RuleConfig(**payload.get("rules", {}))
        test_mandate = MandateState(monthly_cap_amount=1000000, rules=test_rules)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid config payload: {str(e)}")

    blocked_count = 0
    approved_count = 0
    total_scanned = 0

    # Backtest against the immutable audit chain
    for block in global_audit_chain.chain:
        record = block["payload"]
        if record.get("event") == "POLICY_EVALUATION":
            total_scanned += 1
            # Very basic backtest simulation for demonstration
            # If the historical transaction amount > our new proposed auto_approve limit
            amt = record.get("amount", 0)
            if amt > test_mandate.rules.auto_approve_limit:
                blocked_count += 1
            else:
                approved_count += 1

    return {
        "status": "success",
        "simulation_results": {
            "historical_transactions_scanned": total_scanned,
            "would_have_blocked": blocked_count,
            "would_have_approved": approved_count,
            "impact_warning": "High impact!" if blocked_count > approved_count else "Low impact."
        }
    }

