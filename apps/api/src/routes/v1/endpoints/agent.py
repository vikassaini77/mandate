from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic
import os
from packages.ai.orchestrator import AgentOrchestrator
from packages.database.mandate import MandateState
from packages.database.spend_state import SpendState
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

class CitationRequest(BaseModel):
    merchant: str
    amount: float
    rule_id: str
    reasoning: str

@router.post('/generate-citation')
async def generate_citation(req: CitationRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY", "mock-key")
    
    if api_key == "mock-key":
        return {"email": f"Subject: [ACTION REQUIRED] Blocked Transaction - {req.merchant}\n\nDear Employee,\n\nThis is an automated notification from MANDATE Corporate Treasury.\n\nYour recent transaction attempt for ${req.amount:,.2f} at {req.merchant} was BLOCKED by the automated compliance engine.\n\nViolated Policy Rule: {req.rule_id}\nEngine Reasoning: {req.reasoning}\n\nThis transaction conflicts with a hard mandate boundary and cannot be overridden. If you believe this is an error, please contact your department head.\n\nBest regards,\nMANDATE Compliance"}

    client = AsyncAnthropic(api_key=api_key)
    
    prompt = f"""
    You are the automated Corporate Treasury Compliance AI for MANDATE.
    A transaction was just BLOCKED. Write a professional, concise email to the employee 
    explaining why their purchase was denied, citing the exact policy rule.
    
    Transaction Details:
    Merchant: {req.merchant}
    Amount: ${req.amount:,.2f}
    Violated Rule Code: {req.rule_id}
    Internal Engine Reasoning: {req.reasoning}
    
    The tone should be firm, professional, and uncompromising. 
    Use the format:
    Subject: [ACTION REQUIRED] ...
    
    Body ...
    
    Do not use generic pleasantries. Output ONLY the email content.
    """
    
    try:
        response = await client.messages.create(
            model="claude-3-5-sonnet-latest",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )
        return {"email": response.content[0].text}
    except Exception as e:
        return {"email": f"Error generating citation: {str(e)}"}
