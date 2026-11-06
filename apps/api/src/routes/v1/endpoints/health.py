
from fastapi import APIRouter

router = APIRouter()

@router.get('/health')
async def health_check()-> dict[str,str]: 
    return {"status": "ok"}

@router.get('/readiness')
async def readiness_check()-> dict[str,str]:
    return {"status":"ok, we are ready"}

@router.get('/version')
async def get_version(): pass
