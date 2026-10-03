
from fastapi import APIRouter, Header
from typing import Optional
router = APIRouter()

@router.get('/')
async def list_transactions(skip: int = 0, limit: int = 100): pass

@router.post('/{tx_id}/refund')
async def refund_transaction(tx_id: str, idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key')): pass
