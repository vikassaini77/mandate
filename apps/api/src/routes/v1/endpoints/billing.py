from fastapi import APIRouter
from packages.billing.stripe_client import billing_manager

router = APIRouter()

@router.post('/checkout')
async def create_checkout_session(tenant_id: str, plan_id: str = "paypal_plan_enterprise"):
    """
    Item 31 & 32: Billing & PayPal Subscriptions Integration.
    Generates a PayPal subscription checkout URL for the tenant organization.
    """
    url = billing_manager.create_checkout_session(tenant_id, plan_id)
    return {"status": "success", "url": url}

@router.post('/webhook')
async def paypal_billing_webhook(payload: dict):
    """
    Listens for PayPal billing webhooks to update SaaS tenant subscription status.
    """
    success = billing_manager.process_webhook(payload, signature="mock_sig")
    return {"status": "success" if success else "error"}

