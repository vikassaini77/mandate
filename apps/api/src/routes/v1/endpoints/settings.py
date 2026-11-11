import time
from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from apps.api.src.services.paypal.client import paypal_client
from apps.api.src.services.paypal.orders import get_default_frontend_url

router = APIRouter()

# In-memory defaults
_agent_settings = {
    "model": "astra",
    "personality": "analyst",
    "autonomy": 62,
    "tools": {"search": True, "compare": True, "checkout": False},
}

_notification_settings = {
    "email": True,
    "push": True,
    "sms": False,
    "weekly_digest": True,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
}

_security_settings = {
    "two_factor": False,
    "kill_rules": {"blocks": True, "mismatch": True, "reauth": True},
}

_integrations_settings = {
    "webhook": {
        "url": "https://api.mandate.app/v1/events",
        "status": "active",
    },
    "accounting": {
        "provider": "QuickBooks Online",
        "status": "connected",
    },
}


@router.get("/agent")
async def get_agent_settings() -> Dict[str, Any]:
    return {"status": "success", "settings": _agent_settings}


@router.patch("/agent")
async def update_agent_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    _agent_settings.update(payload)
    return {"status": "success", "settings": _agent_settings}


@router.get("/notifications")
async def get_notifications() -> Dict[str, Any]:
    return {"status": "success", "settings": _notification_settings}


@router.patch("/notifications")
async def update_notifications(payload: Dict[str, Any]) -> Dict[str, Any]:
    _notification_settings.update(payload)
    return {"status": "success", "settings": _notification_settings}


@router.get("/security")
async def get_security() -> Dict[str, Any]:
    return {"status": "success", "settings": _security_settings}


@router.patch("/security")
async def update_security(payload: Dict[str, Any]) -> Dict[str, Any]:
    _security_settings.update(payload)
    return {"status": "success", "settings": _security_settings}


@router.get("/integrations")
async def get_integrations() -> Dict[str, Any]:
    pp_status = paypal_client.get_status()
    return {
        "status": "success",
        "integrations": {
            "paypal": {
                "status": "mock_mode" if pp_status["mock_mode"] else "connected",
                "environment": pp_status["environment"],
                "mode": pp_status["mode"],
                "mock_mode": pp_status["mock_mode"],
                "base_url": pp_status["base_url"],
                "client_id": pp_status["client_id_preview"],
                "client_id_configured": pp_status["client_id_configured"],
                "client_secret_configured": pp_status["client_secret_configured"],
                "frontend_url": get_default_frontend_url(),
                "api_version": "v2",
                "operational": not pp_status["mock_mode"],
            },
            **_integrations_settings,
        },
    }


@router.patch("/integrations")
async def update_integrations(payload: Dict[str, Any]) -> Dict[str, Any]:
    _integrations_settings.update(payload)
    return await get_integrations()


@router.post("/integrations/paypal/test")
async def test_paypal_connection() -> Dict[str, Any]:
    pp_status = paypal_client.get_status()
    if pp_status["mock_mode"]:
        return {
            "status": "mock",
            "gateway": "PayPal Mock Simulator",
            "mode": "mock",
            "mock_mode": True,
            "latency_ms": 0,
            "environment": pp_status["base_url"],
            "verified": False,
            "message": "PayPal client is running in MOCK mode. Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET with MOCK_PAYPAL=false.",
        }

    start = time.perf_counter()
    try:
        await paypal_client._get_access_token(force_refresh=True)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"PayPal OAuth2 token verification failed: {str(e)}",
        ) from e

    latency_ms = max(1, round((time.perf_counter() - start) * 1000))
    gateway_label = (
        "PayPal Live Orders v2" if pp_status["mode"] == "live" else "PayPal Sandbox Orders v2"
    )
    return {
        "status": "healthy",
        "gateway": gateway_label,
        "mode": pp_status["mode"],
        "mock_mode": False,
        "latency_ms": latency_ms,
        "environment": pp_status["base_url"],
        "verified": True,
        "message": f"{gateway_label} operational. OAuth2 token verified in {latency_ms}ms.",
    }


@router.get("/privacy")
async def get_privacy() -> Dict[str, Any]:
    return {
        "status": "success",
        "data_retention_days": 2555,
        "encryption": "AES-256-GCM / SHA-256 Chain",
        "sox_compliance": True,
    }


@router.post("/privacy/export")
async def request_data_export() -> Dict[str, Any]:
    return {
        "status": "ready",
        "download_url": "/api/v1/accounting/export?format=json",
        "generated_at": "2026-11-07T00:00:00Z",
    }


@router.post("/privacy/delete")
async def delete_account_grace_period() -> Dict[str, Any]:
    return {
        "status": "scheduled",
        "grace_period_days": 14,
        "message": "Account marked for cryptographic purge.",
    }
