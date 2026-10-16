"""
Legacy module alias: PayPal Subscriptions billing manager.
Re-exported from packages.billing.paypal_billing for backwards compatibility.
"""
from packages.billing.paypal_billing import PayPalBillingManager, billing_manager

__all__ = ["PayPalBillingManager", "billing_manager"]
