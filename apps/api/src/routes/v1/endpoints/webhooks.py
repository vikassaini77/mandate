from fastapi import APIRouter, Request, Form
from fastapi.responses import JSONResponse
import json
from apps.api.src.services.slack_hitl import slack_hitl

router = APIRouter()

@router.post('/paypal')
async def paypal_webhook_inbound(request: Request): pass

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
