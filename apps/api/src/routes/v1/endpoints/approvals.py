from typing import Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException

from apps.api.src.services.auth import Principal, Role, require_roles
from apps.api.src.services.payments.factory import PaymentGatewayFactory

router = APIRouter()

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
    idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key'),
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    """
    Item 13: Human Approval Center.
    Manager approves an escalated transaction, which asynchronously triggers the payment gateway.
    """
    if approval_id not in _APPROVAL_QUEUE:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    req = _APPROVAL_QUEUE[approval_id]
    if req["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Request already processed")
        
    gateway = PaymentGatewayFactory.get_gateway()
    try:
        # Fulfill the order
        intent = await gateway.create_intent(
            amount_cents=req["amount_cents"],
            currency="USD",
            reference_id=f"approved_{approval_id}",
            idempotency_key=idempotency_key
        )
        req["status"] = "APPROVED"
        return {"status": "success", "message": "Transaction approved and payment initiated.", "intent": intent.model_dump()}  # noqa: E501
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/{approval_id}/deny')
async def deny(
    approval_id: str,
    principal: Principal = Depends(require_roles([Role.ADMIN, Role.MANAGER]))
):
    if approval_id not in _APPROVAL_QUEUE:
        raise HTTPException(status_code=404, detail="Approval request not found")
        
    _APPROVAL_QUEUE[approval_id]["status"] = "DENIED"
    return {"status": "success", "message": "Transaction firmly denied."}
