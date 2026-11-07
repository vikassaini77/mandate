
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()

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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "https://dkfsfwckshejdjxmvxxx.supabase.co",
        *( [os.getenv("FRONTEND_URL")] if os.getenv("FRONTEND_URL") else [] )
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
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
    try:
        from apps.api.src.routes.v1.endpoints.transactions import _TRANSACTIONS

        if _TRANSACTIONS:
            dynamic_activity = []
            for tx in _TRANSACTIONS[:50]:
                amount = tx.get("amount")
                if amount is None:
                    amount = (tx.get("amount_cents", 0) or 0) / 100.0

                verdict = str(tx.get("verdict", "APPROVE")).lower()
                decision = "approved" if verdict == "approve" else ("blocked" if verdict == "block" else "review")

                dynamic_activity.append({
                    "id": tx.get("id"),
                    "merchant": tx.get("merchant", "Vendor"),
                    "item": tx.get("description", f"{tx.get('category', 'General')} order"),
                    "amount": round(amount, 2),
                    "decision": decision,
                    "time": tx.get("timestamp", "Recent"),
                    "rule": tx.get("rule_id", "MND-AUTO-01"),
                })
            return dynamic_activity
    except Exception as e:
        print("Error serving dynamic activity:", e)

    return activity


@app.get("/api/audit-events")
async def get_audit_events():
    try:
        from packages.database.hash_chain import global_audit_chain

        if global_audit_chain.chain:
            dynamic_audit = []
            for idx, block in enumerate(reversed(global_audit_chain.chain[-200:])):
                payload = block.get("payload", {})
                verdict = str(payload.get("verdict", payload.get("decision", "APPROVE"))).upper()
                amount_raw = payload.get("amount", payload.get("amount_cents", 0)) or 0
                amount = float(amount_raw) / 100.0 if amount_raw > 1000 else float(amount_raw)

                merchant = payload.get("merchant", "Verified Vendor")
                category = payload.get("category", "General")
                rule_id = payload.get("rule_id", "MND-POL-001")
                timestamp = payload.get("timestamp") or str(block.get("timestamp", ""))

                decision = "approved" if verdict == "APPROVE" else ("blocked" if verdict == "BLOCK" else "review")
                event_type = (
                    "payment.authorized"
                    if verdict == "APPROVE"
                    else ("purchase.blocked" if verdict == "BLOCK" else "policy.evaluated")
                )

                dynamic_audit.append({
                    "id": f"evt_{idx + 1}_{block.get('hash', '')[:8]}",
                    "timestamp": timestamp,
                    "occurredAt": timestamp,
                    "type": event_type,
                    "summary": f"{verdict}: {merchant} · ${amount:.2f}",
                    "verdict": verdict,
                    "ruleId": rule_id,
                    "ruleCode": rule_id,
                    "rule": payload.get("reason", f"Evaluated under rule {rule_id}"),
                    "reasoning": payload.get("reason", "Deterministic Policy Engine evaluation"),
                    "merchant": merchant,
                    "item": payload.get("description", f"{category} purchase"),
                    "category": category,
                    "amount": round(amount, 2),
                    "decision": decision,
                    "sha256": block.get("hash", ""),
                    "paypalOrderId": payload.get("paypal_order_id"),
                })
            return dynamic_audit
    except Exception as e:
        print("Error serving dynamic audit events:", e)

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
    try:
        from collections import defaultdict
        from datetime import datetime

        from apps.api.src.routes.v1.endpoints.transactions import _TRANSACTIONS

        if _TRANSACTIONS:
            daily_spend = defaultdict(lambda: {"approved": 0.0, "blocked": 0.0})

            for tx in _TRANSACTIONS:
                ts = tx.get("timestamp")
                day_str = "Recent"
                if ts:
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        day_str = dt.strftime("%b %d")
                    except Exception:
                        pass

                amount = tx.get("amount")
                if amount is None:
                    amount = (tx.get("amount_cents", 0) or 0) / 100.0

                verdict = str(tx.get("verdict", "")).upper()
                if verdict == "APPROVE":
                    daily_spend[day_str]["approved"] += amount
                elif verdict == "BLOCK":
                    daily_spend[day_str]["blocked"] += amount

            if daily_spend:
                return [
                    {
                        "day": day,
                        "approved": round(vals["approved"], 2),
                        "blocked": round(vals["blocked"], 2),
                    }
                    for day, vals in daily_spend.items()
                ][-7:]
    except Exception as e:
        print("Error serving dynamic spend series:", e)

    return spendData
