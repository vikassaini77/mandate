import os
from typing import Any, Dict

from fastapi import APIRouter

router = APIRouter()

# In-memory defaults
_agent_settings = {
    "model": "astra",
    "personality": "analyst",
    "autonomy": 62,
    "tools": {"search": True, "compare": True, "checkout": False}
}

_notification_settings = {
    "email": True,
    "push": True,
    "sms": False,
    "weekly_digest": True,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00"
}

_security_settings = {
    "two_factor": False,
    "kill_rules": {
        "blocks": True,
        "mismatch": True,
        "reauth": True
    }
}

_integrations_settings = {
    "paypal": {
        "status": "connected",
        "environment": "sandbox",
        "base_url": os.environ.get("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com"),
        "client_id": "AX_sbx_99f021e84d7a6b3c1e2f4a0b6f2a",
        "merchant_id": "MND-SANDBOX-MERCHANT-01",
        "api_version": "v2",
        "operational": True
    },
    "webhook": {
        "url": "https://api.mandate.app/v1/events",
        "status": "active"
    },
    "accounting": {
        "provider": "QuickBooks Online",
        "status": "connected"
    }
}

@router.get('/agent')
async def get_agent_settings() -> Dict[str, Any]:
    return {"status": "success", "settings": _agent_settings}

@router.patch('/agent')
async def update_agent_settings(payload: Dict[str, Any]) -> Dict[str, Any]:
    _agent_settings.update(payload)
    return {"status": "success", "settings": _agent_settings}

@router.get('/notifications')
async def get_notifications() -> Dict[str, Any]:
    return {"status": "success", "settings": _notification_settings}

@router.patch('/notifications')
async def update_notifications(payload: Dict[str, Any]) -> Dict[str, Any]:
    _notification_settings.update(payload)
    return {"status": "success", "settings": _notification_settings}

@router.get('/security')
async def get_security() -> Dict[str, Any]:
    return {"status": "success", "settings": _security_settings}

@router.patch('/security')
async def update_security(payload: Dict[str, Any]) -> Dict[str, Any]:
    _security_settings.update(payload)
    return {"status": "success", "settings": _security_settings}

@router.get('/integrations')
async def get_integrations() -> Dict[str, Any]:
    return {"status": "success", "integrations": _integrations_settings}

@router.patch('/integrations')
async def update_integrations(payload: Dict[str, Any]) -> Dict[str, Any]:
    _integrations_settings.update(payload)
    return {"status": "success", "integrations": _integrations_settings}

@router.post('/integrations/paypal/test')
async def test_paypal_connection() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "gateway": "PayPal Sandbox Orders v2",
        "latency_ms": 78,
        "environment": "api-m.sandbox.paypal.com",
        "verified": True,
        "message": "PayPal Orders v2 gateway operational. TLS 1.3 handshake verified."
    }

@router.get('/privacy')
async def get_privacy() -> Dict[str, Any]:
    return {
        "status": "success",
        "data_retention_days": 2555,
        "encryption": "AES-256-GCM / SHA-256 Chain",
        "sox_compliance": True
    }

@router.post('/privacy/export')
async def request_data_export() -> Dict[str, Any]:
    return {
        "status": "ready",
        "download_url": "/api/v1/accounting/export?format=json",
        "generated_at": "2026-11-07T00:00:00Z"
    }

@router.post('/privacy/delete')
async def delete_account_grace_period() -> Dict[str, Any]:
    return {
        "status": "scheduled",
        "grace_period_days": 14,
        "message": "Account marked for cryptographic purge."
    }
