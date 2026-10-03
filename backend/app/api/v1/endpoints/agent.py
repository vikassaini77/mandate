from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic
import os
from app.agent.orchestrator import AgentOrchestrator
from app.domain.mandate import MandateState
from app.domain.spend_state import SpendState
import datetime

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list = []

@router.post('/chat/stream')
async def chat_stream(request: ChatRequest):
    # Mock data until DB is wired
    client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", "mock-key"))
    
    mock_mandate = MandateState(
        id="m_123",
        user_id="u_123",
        monthly_limit=50000, # $500.00
        allowed_categories=["Electronics", "Software"],
        blocked_merchants=["Amazon"],
        active=True
    )
    
    mock_spend = SpendState(
        mandate_id="m_123",
        month="2026-10",
        amount_spent=15000, # $150.00
        daily_count=1,
        last_purchase_at=datetime.datetime.now(datetime.timezone.utc)
    )
    
    orchestrator = AgentOrchestrator(client=client, mandate=mock_mandate, spend_state=mock_spend)
    
    return StreamingResponse(
        orchestrator.stream_loop(request.message, request.history),
        media_type="text/event-stream"
    )

@router.get('/conversations')
async def list_conversations(skip: int = 0, limit: int = 100): 
    return {"conversations": []}

@router.get('/conversations/{conv_id}')
async def get_conversation(conv_id: str): 
    return {"id": conv_id, "messages": []}

@router.delete('/conversations/{conv_id}')
async def delete_conversation(conv_id: str): 
    return {"status": "deleted"}

@router.get('/conversations/export')
async def export_conversations(): 
    return {"url": "mock-export-url"}
