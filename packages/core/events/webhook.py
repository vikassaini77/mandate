import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

class WebhookDispatcher:
    """
    Item 27: Webhooks
    Dispatches real-time events to registered external developer endpoints.
    """
    _registered_endpoints: list[str] = []

    @classmethod
    def register_endpoint(cls, url: str):
        if url not in cls._registered_endpoints:
            cls._registered_endpoints.append(url)

    @classmethod
    async def dispatch(cls, event_type: str, payload: dict[str, Any]):
        if not cls._registered_endpoints:
            return
            
        event_data = {
            "event": event_type,
            "data": payload
        }
        
        async with httpx.AsyncClient() as client:
            tasks = []
            for url in cls._registered_endpoints:
                tasks.append(client.post(url, json=event_data))
                
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for url, result in zip(cls._registered_endpoints, results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to dispatch webhook to {url}: {result}")
                else:
                    logger.info(f"Successfully dispatched {event_type} to {url}")
