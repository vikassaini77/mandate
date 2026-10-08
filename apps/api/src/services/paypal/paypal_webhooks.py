from typing import Any, Dict

from apps.api.src.services.paypal.client import paypal_client
from apps.api.src.services.paypal.errors import PayPalWebhookVerificationError


async def verify_webhook_signature(
    transmission_id: str,
    transmission_time: str,
    cert_url: str,
    auth_algo: str,
    transmission_sig: str,
    webhook_id: str,
    webhook_event: Dict[str, Any]
) -> bool:
    """
    Calls PayPal's /v1/notifications/verify-webhook-signature to verify the payload.
    """
    if paypal_client.mock_mode:
        return True # Simulator bypasses signature check
        
    payload = {
        "transmission_id": transmission_id,
        "transmission_time": transmission_time,
        "cert_url": cert_url,
        "auth_algo": auth_algo,
        "transmission_sig": transmission_sig,
        "webhook_id": webhook_id,
        "webhook_event": webhook_event
    }
    
    try:
        response = await paypal_client.request(
            method="POST",
            endpoint="/v1/notifications/verify-webhook-signature",
            json=payload
        )
        return response.get("verification_status") == "SUCCESS"
    except Exception as e:
        raise PayPalWebhookVerificationError(f"Failed to verify webhook signature: {str(e)}", getattr(e, 'status_code', 500))  # noqa: E501

async def handle_webhook_event(event: Dict[str, Any], session, redis_client=None):
    """
    Idempotent processing of PayPal Webhook events.
    In a real implementation, `redis_client` or a DB lock ensures idempotency via event['id'].
    """
    event_type = event.get("event_type")
    event.get("resource", {})
    
    # 1. Idempotency Check
    event_id = event.get("id")
    if redis_client:
        if await redis_client.get(f"webhook_processed:{event_id}"):
            return {"status": "already_processed"}
            
    # 2. Handle specific events
    if event_type == "CHECKOUT.ORDER.APPROVED":
        # The user approved on PayPal UI. We can now capture it.
        # Flow: update local Order status -> Trigger capture
        pass
        
    elif event_type == "PAYMENT.CAPTURE.COMPLETED":
        # Capture succeeded.
        # Flow: update Order/Transaction status -> push SSE update to frontend
        pass
        
    elif event_type == "PAYMENT.CAPTURE.DENIED":
        # Capture failed/denied.
        pass
        
    elif event_type == "PAYMENT.CAPTURE.REFUNDED":
        # Refund processed.
        pass

    # 3. Mark processed
    if redis_client:
        await redis_client.setex(f"webhook_processed:{event_id}", 86400 * 7, "1") # 7 days
        
    return {"status": "success", "handled_event": event_type}
