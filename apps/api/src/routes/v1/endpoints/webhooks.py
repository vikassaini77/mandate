
from fastapi import APIRouter, Request
router = APIRouter()

@router.post('/paypal')
async def paypal_webhook_inbound(request: Request): pass

@router.get('/outbound')
async def list_outbound_endpoints(): pass

@router.post('/outbound')
async def create_outbound_endpoint(): pass

@router.get('/outbound/{endpoint_id}/logs')
async def get_delivery_logs(endpoint_id: str): pass

@router.post('/outbound/{endpoint_id}/test')
async def test_webhook(endpoint_id: str): pass
