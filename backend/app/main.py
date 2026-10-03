from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from scripts.seed import (
    activity, 
    auditRecords, 
    products, 
    purchaseProposals, 
    redTeamScenarios, 
    spendData
)
from app.ml.manager import MLManager
from app.api.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="MANDATE API", description="Backend API for the MANDATE shopping agent policy engine.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    # Lazy load ML models at startup
    MLManager.load_models()

@app.get("/ml/health")
async def ml_health():
    return MLManager.get_health()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
