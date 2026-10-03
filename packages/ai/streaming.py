import asyncio
import json
from typing import AsyncGenerator
from anthropic import AsyncAnthropic

async def stream_agent_events(
    client: AsyncAnthropic,
    messages: list,
    system_prompt: str,
    tools: list
) -> AsyncGenerator[str, None]:
    """
    Streams Server-Sent Events (SSE) back to the client.
    Supports structured events: token, tool_call, product_cards, verdict, error, done.
    """
    try:
        # Example using Anthropic stream API
        async with client.messages.stream(
            model="claude-3-haiku-20240307",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
            tools=tools
        ) as stream:
            async for event in stream:
                if event.type == "text_delta":
                    payload = {"type": "token", "content": event.text}
                    yield f"data: {json.dumps(payload)}\n\n"
                elif event.type == "tool_use":
                    payload = {"type": "tool_call", "name": event.name, "input": event.input}
                    yield f"data: {json.dumps(payload)}\n\n"
                    
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    except asyncio.CancelledError:
        # Support cancellation and reconnect
        yield f"data: {json.dumps({'type': 'error', 'message': 'Stream cancelled'})}\n\n"
        raise
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
