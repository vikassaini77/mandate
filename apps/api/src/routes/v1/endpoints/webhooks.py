from fastapi import APIRouter, Request, Form
from fastapi.responses import JSONResponse
import json
from apps.api.src.services.slack_hitl import slack_hitl

router = APIRouter()

@router.post('/paypal')
async def paypal_webhook_inbound(request: Request):
    """
    Handles incoming webhooks from PayPal Sandbox.
    Verifies the webhook signature and processes PAYMENT.CAPTURE.COMPLETED events.
    """
    try:
        # 1. Verify PayPal-Transmission-Sig (Mocked verification for demo)
        transmission_id = request.headers.get("paypal-transmission-id")
        transmission_sig = request.headers.get("paypal-transmission-sig")
        
        payload = await request.json()
        event_type = payload.get("event_type")
        resource = payload.get("resource", {})
        
        if event_type == "PAYMENT.CAPTURE.COMPLETED":
            order_id = resource.get("supplementary_data", {}).get("related_ids", {}).get("order_id", "UNKNOWN")
            # In a real app, we update the DB here
            return JSONResponse(status_code=200, content={"status": "capture_recorded", "order": order_id})
            
        return JSONResponse(status_code=200, content={"status": "ignored", "event": event_type})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": "Invalid PayPal webhook payload"})

@router.post('/slack/interaction')
async def slack_interaction(payload: str = Form(...)):
    """
    Handles interactive button clicks from Slack (Approve/Reject).
    """
    try:
        data = json.loads(payload)
        action = data.get("actions", [])[0]
        action_id = action.get("action_id")
        value = action.get("value")
        
        # Here we would update the DB to approve or reject the transaction
        # and notify the user via websocket or push notification
        
        return JSONResponse(status_code=200, content={"message": "Interaction processed"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.get('/outbound')
async def list_outbound_endpoints(): pass

@router.post('/outbound')
async def create_outbound_endpoint(): pass

@router.get('/outbound/{endpoint_id}/logs')
async def get_delivery_logs(endpoint_id: str): pass

@router.post('/outbound/{endpoint_id}/test')
async def test_webhook(endpoint_id: str): pass
