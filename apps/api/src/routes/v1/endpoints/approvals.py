
from fastapi import APIRouter, Header
from typing import Optional
router = APIRouter()

@router.get('/queue')
async def get_approval_queue(skip: int = 0, limit: int = 100): pass

@router.post('/{approval_id}/approve')
async def approve(approval_id: str, idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key')): pass

@router.post('/{approval_id}/deny')
async def deny(approval_id: str): pass

@router.patch('/{approval_id}')
async def modify_approval(approval_id: str, payload: dict): pass
