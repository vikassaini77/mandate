import asyncio


class SecurityMonitor:
    _instance = None
    
    def __init__(self):
        self.queues = []
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
        
    async def subscribe(self):
        q = asyncio.Queue()
        self.queues.append(q)
        try:
            while True:
                event = await q.get()
                yield event
        finally:
            self.queues.remove(q)
            
    async def emit_threat(self, payload: dict):
        for q in self.queues:
            await q.put(payload)
