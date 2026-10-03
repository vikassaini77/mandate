
from fastapi import APIRouter
router = APIRouter()

@router.get('/health')
async def health_check(): pass

@router.get('/readiness')
async def readiness_check(): pass

@router.get('/version')
async def get_version(): pass
