from fastapi import FastAPI
from apps.api.src.routes.v1.endpoints.ml import router
import uvicorn

app = FastAPI()
app.include_router(router, prefix="/api/v1/ml")

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8001)
