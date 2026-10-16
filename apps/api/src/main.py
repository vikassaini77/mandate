
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from packages.ai.sanitizer import DataSanitizer
from packages.ml.manager import MLManager
from scripts.redteam.seed import (
    activity,
    auditRecords,
    products,
    purchaseProposals,
    redTeamScenarios,
    spendData,
)
from starlette.middleware.base import BaseHTTPMiddleware

from apps.api.src.routes.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load ML models before accepting traffic
    MLManager.load_models()
    yield

app = FastAPI(
    title="MANDATE API", 
    description="Backend API for the MANDATE shopping agent policy engine.",
    lifespan=lifespan
)  # noqa: E501

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"  # noqa: E501
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "frame-ancestors 'none';"
            )
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

class SanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # AI/Prompt Injection defense targeting agent/chat prompt endpoints
        if request.method in ["POST", "PUT"] and any(p in request.url.path for p in ["/agent", "/chat", "/redteam"]):
            try:
                body = await request.body()
                if body:
                    text_body = body.decode('utf-8', errors='ignore')
                    risk_score = DataSanitizer.score_risk(text_body)
                    if risk_score > 0.8:
                        from fastapi.responses import JSONResponse
                        return JSONResponse(status_code=403, content={"error": "Payload flagged by ML risk scorer: High probability of Prompt Injection or Malicious Override."})  # noqa: E501
            except Exception:
                pass
        return await call_next(request)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SanitizationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://hkquzuoqtdcjlixrsisb.supabase.co"],  # noqa: E501
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-API-Key"],
)

app.include_router(api_router, prefix="/api/v1")

# Startup logic is now handled by lifespan context manager.

@app.get("/ml/health")
async def ml_health():
    return MLManager.get_health()

@app.get("/api/activity")
async def get_activity():
    return activity

@app.get("/api/audit-events")
async def get_audit_events():
    return auditRecords

@app.get("/api/products")
async def get_products():
    return products

@app.get("/api/purchase-proposals")
async def get_purchase_proposals():
    return purchaseProposals

@app.get("/api/red-team-scenarios")
async def get_red_team_scenarios():
    return redTeamScenarios

@app.get("/api/spend-series")
async def get_spend_series():
    return spendData
