from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts.redteam.seed import (
    activity, 
    auditRecords, 
    products, 
    purchaseProposals, 
    redTeamScenarios, 
    spendData
)
from packages.ml.manager import MLManager
from apps.api.src.routes.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from packages.ai.sanitizer import DataSanitizer

app = FastAPI(title="MANDATE API", description="Backend API for the MANDATE shopping agent policy engine.")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response

class SanitizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # AI/Prompt Injection FAANG-level defense
        if request.method in ["POST", "PUT"]:
            body = await request.body()
            if body:
                text_body = body.decode('utf-8')
                risk_score = DataSanitizer.score_risk(text_body)
                if risk_score > 0.8:
                    from fastapi.responses import JSONResponse
                    return JSONResponse(status_code=403, content={"error": "Payload flagged by ML risk scorer: High probability of Prompt Injection or Malicious Override."})
        return await call_next(request)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(SanitizationMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080", "https://hkquzuoqtdcjlixrsisb.supabase.co"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    # Lazy load ML models at startup
    MLManager.load_models()

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
