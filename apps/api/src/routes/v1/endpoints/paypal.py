from typing import Any, Dict

from fastapi import APIRouter

from apps.api.src.services.paypal.client import paypal_client
from apps.api.src.services.paypal.orders import get_default_frontend_url

router = APIRouter()


@router.get("/status")
async def get_paypal_status() -> Dict[str, Any]:
    """
    Returns non-secret runtime diagnostics for the PayPal Orders v2 gateway.
    """
    status = paypal_client.get_status()
    return {
        "status": "ok",
        **status,
        "frontend_url": get_default_frontend_url(),
    }
