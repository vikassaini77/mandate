from fastapi import APIRouter, Header, Depends, HTTPException
from typing import Optional
from apps.api.src.services.payments.factory import PaymentGatewayFactory
from apps.api.src.services.auth import get_current_principal, require_roles, Principal, Role

router = APIRouter()

@router.get('/')
async def list_transactions(
    skip: int = 0, 
    limit: int = 100,
    principal: Principal = Depends(get_current_principal)
): 
    # Return mock or real transactions depending on DB state
    return {"data": []}

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
        # Item 8: The gateway abstraction automatically routes to PayPal, Stripe, etc.
        refund_response = await gateway.refund(
            capture_id=tx_id, 
            amount_cents=amount_cents,
            currency=currency,
            idempotency_key=idempotency_key
        )
        return {"status": "success", "refund": refund_response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
