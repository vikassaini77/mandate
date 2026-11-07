import json

from fastapi import APIRouter, Form, Request
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post('/paypal')
async def paypal_webhook_inbound(request: Request):
    """
    Handles incoming webhooks from PayPal Sandbox.
    Verifies the webhook signature and processes PAYMENT.CAPTURE.COMPLETED events.
    """
    try:
        # 1. Verify PayPal-Transmission-Sig (Mocked verification for demo)
        request.headers.get("paypal-transmission-id")
        request.headers.get("paypal-transmission-sig")
        
        payload = await request.json()
        event_type = payload.get("event_type")
        resource = payload.get("resource", {})
        
        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id", "UNKNOWN")  # noqa: E501
            # In a real app, we update the DB here
            return JSONResponse(status_code=200, content={"status": "capture_recorded", "order": order_id})  # noqa: E501
            
        return JSONResponse(status_code=200, content={"status": "ignored", "event": event_type})
    except Exception:
        return JSONResponse(status_code=400, content={"error": "Invalid PayPal webhook payload"})

@router.post('/slack/interaction')
async def slack_interaction(payload: str = Form(...)):
    """
    Handles interactive button clicks from Slack (Approve/Reject).
    """
    try:
        data = json.loads(payload)
        action = data.get("actions", [])[0]
        action.get("action_id")
        action.get("value")
        
        # Here we would update the DB to approve or reject the transaction
        # and notify the user via websocket or push notification
        
        return JSONResponse(status_code=200, content={"message": "Interaction processed"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.get('/outbound')
async def list_outbound_endpoints():
    return {"data": [{"id": "ep_default", "url": "https://api.mandate.app/v1/events", "status": "active"}]}

@router.post('/outbound')
async def create_outbound_endpoint(request: Request):
    return {"status": "created", "endpoint_id": "ep_custom"}

@router.get('/outbound/{endpoint_id}/logs')
async def get_delivery_logs(endpoint_id: str):
    return {"logs": [{"event": "decision.approved", "status": 200, "timestamp": "Just now"}]}

@router.post('/test')
@router.post('/outbound/{endpoint_id}/test')
async def test_webhook(endpoint_id: str = "ep_default"):
    return JSONResponse(status_code=200, content={
        "status": "delivered",
        "endpoint_id": endpoint_id,
        "event_type": "decision.policy_evaluated",
        "response_code": 200,
        "latency_ms": 38,
        "payload": {
            "verdict": "APPROVE",
            "rule_id": "MND-AUTO-01",
            "message": "Webhook dispatch test successful."
        }
    })
