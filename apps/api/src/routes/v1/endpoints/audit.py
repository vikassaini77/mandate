
from fastapi import APIRouter
router = APIRouter()

@router.get('/')
async def list_audit_events(skip: int = 0, limit: int = 100, search: str = None): pass

@router.get('/export')
async def export_audit(format: str = 'csv'): pass

@router.post('/verify-chain')
async def verify_chain(): pass
