import uvicorn
from fastapi import FastAPI

from apps.api.src.routes.v1.endpoints.audit import router

app = FastAPI()
app.include_router(router, prefix="/api/v1/audit")

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)
