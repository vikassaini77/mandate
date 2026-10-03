import uuid
from typing import Dict, Any
from app.paypal.client import paypal_client
from app.paypal.errors import PayPalOrderError

async def create_order(amount_cents: int, currency: str, reference_id: str, idempotency_key: str = None) -> Dict[str, Any]:
    """
    Creates a PayPal Order with INTENT = CAPTURE.
    Amount must be converted from cents to string decimal format (e.g., 1050 -> '10.50').
    """
    if not idempotency_key:
        idempotency_key = f"create_{reference_id}_{uuid.uuid4().hex[:8]}"

    amount_str = f"{amount_cents / 100:.2f}"
    
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "reference_id": reference_id,
                "amount": {
                    "currency_code": currency,
                    "value": amount_str
                }
            }
        ]
    }
    
    try:
        response = await paypal_client.request(
            method="POST",
            endpoint="/v2/checkout/orders",
            json=payload,
            idempotency_key=idempotency_key
        )
        return response
    except Exception as e:
        raise PayPalOrderError(f"Failed to create order: {str(e)}", getattr(e, 'status_code', 500))

async def capture_order(order_id: str, idempotency_key: str = None) -> Dict[str, Any]:
    """
    Captures an approved PayPal Order.
    """
    if not idempotency_key:
        idempotency_key = f"capture_{order_id}_{uuid.uuid4().hex[:8]}"

    try:
        response = await paypal_client.request(
            method="POST",
            endpoint=f"/v2/checkout/orders/{order_id}/capture",
            json={},
            idempotency_key=idempotency_key
        )
        return response
    except Exception as e:
        raise PayPalOrderError(f"Failed to capture order {order_id}: {str(e)}", getattr(e, 'status_code', 500))

async def get_order(order_id: str) -> Dict[str, Any]:
    """
    Retrieves details of an existing Order.
    """
    try:
        response = await paypal_client.request(
            method="GET",
            endpoint=f"/v2/checkout/orders/{order_id}"
        )
        return response
    except Exception as e:
        raise PayPalOrderError(f"Failed to fetch order {order_id}: {str(e)}", getattr(e, 'status_code', 500))

async def refund_capture(capture_id: str, idempotency_key: str = None, amount_cents: int = None, currency: str = None) -> Dict[str, Any]:
    """
    Refunds a captured payment.
    """
    if not idempotency_key:
        idempotency_key = f"refund_{capture_id}_{uuid.uuid4().hex[:8]}"
        
    payload = {}
    if amount_cents and currency:
        payload["amount"] = {
            "value": f"{amount_cents / 100:.2f}",
            "currency_code": currency
        }

    try:
        response = await paypal_client.request(
            method="POST",
            endpoint=f"/v2/payments/captures/{capture_id}/refund",
            json=payload,
            idempotency_key=idempotency_key
        )
        return response
    except Exception as e:
        raise PayPalOrderError(f"Failed to refund capture {capture_id}: {str(e)}", getattr(e, 'status_code', 500))
