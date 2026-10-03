
from fastapi import APIRouter
router = APIRouter()

@router.get('/scenarios')
async def get_scenarios(): pass

@router.post('/run')
async def run_scenario(scenario_id: str): pass

@router.get('/results')
async def get_results(skip: int = 0, limit: int = 100): pass

@router.get('/scoreboard')
async def get_scoreboard(): pass

from fastapi.responses import StreamingResponse
from apps.api.src.services.security_monitor import SecurityMonitor
import json

@router.get('/security-stream')
async def security_stream():
    """Real-time SSE stream of intercepted threats and ML anomalies"""
    async def event_generator():
        monitor = SecurityMonitor.get_instance()
        async for event in monitor.subscribe():
            yield f"data: {json.dumps(event)}\n\n"
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")
