
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
router = APIRouter()

@router.post('/chat/stream')
async def chat_stream(): pass

@router.get('/conversations')
async def list_conversations(skip: int = 0, limit: int = 100): pass

@router.get('/conversations/{conv_id}')
async def get_conversation(conv_id: str): pass

@router.delete('/conversations/{conv_id}')
async def delete_conversation(conv_id: str): pass

@router.get('/conversations/export')
async def export_conversations(): pass
