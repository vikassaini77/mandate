from fastapi import APIRouter
from packages.billing.stripe_client import billing_manager

router = APIRouter()

@router.post('/checkout')
async def create_checkout_session(tenant_id: str, plan_id: str = "price_premium_1"):
    """
    Item 31 & 32: Billing & Stripe Integration.
    Generates a Stripe Checkout URL for the organization.
    """
    url = billing_manager.create_checkout_session(tenant_id, plan_id)
    return {"status": "success", "url": url}

@router.post('/webhook')
async def stripe_webhook(payload: dict):
    """
    Listens for Stripe webhooks to update SaaS tenant subscription status.
    """
    # In production, verify Stripe signature header here
    success = billing_manager.process_webhook(payload, signature="mock_sig")
    return {"status": "success" if success else "error"}
