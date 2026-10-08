
from fastapi import APIRouter

router = APIRouter()

@router.get('/spend')
async def spend_analytics(): pass

@router.get('/categories')
async def category_analytics(): pass

@router.get('/approval-rate')
async def approval_rate(): pass

@router.get('/decision-latency')
async def decision_latency(): pass

@router.get('/blocked-heatmap')
async def blocked_heatmap(): pass

@router.get('/model-metrics')
async def model_metrics(): pass
