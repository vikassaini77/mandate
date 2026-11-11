from typing import Any, Dict, Optional

from apps.api.src.services.payments.gateway import PaymentGateway, PaymentIntent
from apps.api.src.services.paypal.orders import (
    capture_order,
    create_order,
    extract_capture_info,
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
        idempotency_key: Optional[str] = None,
        return_url: Optional[str] = None,
        cancel_url: Optional[str] = None,
    ) -> PaymentIntent:
        raw_order = await create_order(
            amount_cents=amount_cents,
            currency=currency,
            reference_id=reference_id,
            idempotency_key=idempotency_key,
            return_url=return_url,
            cancel_url=cancel_url,
        )
        return PaymentIntent(
            id=raw_order.get("id"),
            status=raw_order.get("status"),
            amount_cents=amount_cents,
            currency=currency,
            provider_raw=raw_order,
        )

    async def capture_intent(
        self,
        intent_id: str,
        idempotency_key: Optional[str] = None,
    ) -> PaymentIntent:
        raw_order = await capture_order(
            order_id=intent_id,
            idempotency_key=idempotency_key,
        )
        _, captured_cents, captured_currency = extract_capture_info(raw_order)
        return PaymentIntent(
            id=raw_order.get("id") or intent_id,
            status=raw_order.get("status") or "COMPLETED",
            amount_cents=captured_cents or 0,
            currency=captured_currency,
            provider_raw=raw_order,
        )

    async def get_intent(self, intent_id: str) -> PaymentIntent:
        raw_order = await get_order(order_id=intent_id)

        # PayPal specific parsing
        _, parsed_cents, parsed_currency = extract_capture_info(raw_order)
        return PaymentIntent(
            id=raw_order.get("id") or intent_id,
            status=raw_order.get("status") or "UNKNOWN",
            amount_cents=parsed_cents or 0,
            currency=parsed_currency,
            provider_raw=raw_order,
        )

    async def refund(
        self,
        capture_id: str,
        amount_cents: Optional[int] = None,
        currency: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        return await refund_capture(
            capture_id=capture_id,
            idempotency_key=idempotency_key,
            amount_cents=amount_cents,
            currency=currency,
        )
