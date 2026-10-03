
from fastapi import APIRouter
router = APIRouter()

@router.get('/')
async def list_proposals(skip: int = 0, limit: int = 100): pass

@router.get('/{proposal_id}')
async def get_proposal(proposal_id: str): pass
