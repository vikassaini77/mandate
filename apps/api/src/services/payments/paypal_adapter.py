from typing import Any, Dict, Optional

from apps.api.src.services.payments.gateway import PaymentGateway, PaymentIntent
from apps.api.src.services.paypal.orders import (
    capture_order,
    create_order,
    get_order,
    refund_capture,
)


class PayPalAdapter(PaymentGateway):
    """
    Concrete implementation of PaymentGateway for PayPal.
    Adapts the existing PayPal client methods into the standard interface.
    """
    
    async def create_intent(
        self, 
        amount_cents: int, 
        currency: str, 
        reference_id: str, 
        idempotency_key: Optional[str] = None
    ) -> PaymentIntent:
        raw_order = await create_order(
            amount_cents=amount_cents, 
            currency=currency, 
            reference_id=reference_id, 
            idempotency_key=idempotency_key
        )
        return PaymentIntent(
            id=raw_order.get("id"),
            status=raw_order.get("status"),
            amount_cents=amount_cents,
            currency=currency,
            provider_raw=raw_order
        )

    async def capture_intent(
        self, 
        intent_id: str, 
        idempotency_key: Optional[str] = None
    ) -> PaymentIntent:
        raw_order = await capture_order(
            order_id=intent_id, 
            idempotency_key=idempotency_key
        )
        return PaymentIntent(
            id=raw_order.get("id"),
            status=raw_order.get("status"),
            amount_cents=0, # This might need fetching the order first in a real setup if amount is required.  # noqa: E501
            currency="",
            provider_raw=raw_order
        )

    async def get_intent(self, intent_id: str) -> PaymentIntent:
        raw_order = await get_order(order_id=intent_id)
        
        # PayPal specific parsing
        amount_cents = 0
        currency = "USD"
        try:
            purchase_units = raw_order.get("purchase_units", [])
            if purchase_units:
                amount_obj = purchase_units[0].get("amount", {})
                amount_val = float(amount_obj.get("value", "0"))
                amount_cents = int(amount_val * 100)
                currency = amount_obj.get("currency_code", "USD")
        except Exception:
            pass

        return PaymentIntent(
            id=raw_order.get("id"),
            status=raw_order.get("status"),
            amount_cents=amount_cents,
            currency=currency,
            provider_raw=raw_order
        )

    async def refund(
        self, 
        capture_id: str, 
        amount_cents: Optional[int] = None, 
        currency: Optional[str] = None, 
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        return await refund_capture(
            capture_id=capture_id, 
            idempotency_key=idempotency_key, 
            amount_cents=amount_cents, 
            currency=currency
        )
