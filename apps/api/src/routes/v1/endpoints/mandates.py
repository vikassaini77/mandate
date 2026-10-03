
from fastapi import APIRouter, Depends, Header
from typing import Optional
router = APIRouter()

@router.get('/')
async def list_mandates(skip: int = 0, limit: int = 100): pass

@router.post('/')
async def create_mandate(idempotency_key: Optional[str] = Header(None, alias='Idempotency-Key')): pass

@router.get('/{mandate_id}')
async def get_mandate(mandate_id: str): pass

@router.post('/parse')
async def parse_mandate(raw_text: str): pass

@router.post('/simulate')
async def simulate_mandate(mandate_id: str, payload: dict): pass

@router.get('/{mandate_id}/versions')
async def get_mandate_versions(mandate_id: str): pass

@router.post('/{mandate_id}/rollback')
async def rollback_mandate(mandate_id: str, version: int): pass

@router.post('/{mandate_id}/activate')
async def activate_mandate(mandate_id: str): pass
