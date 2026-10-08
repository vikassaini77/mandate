import os

from apps.api.src.services.payments.gateway import PaymentGateway
from apps.api.src.services.payments.paypal_adapter import PayPalAdapter


class PaymentGatewayFactory:
    """
    Factory to retrieve the appropriate PaymentGateway based on tenant configuration or environment variables.  # noqa: E501
    """
    
    @classmethod
    def get_gateway(cls, provider: str = None) -> PaymentGateway:
        """
        Retrieves a PaymentGateway. Defaults to PAYPAL if not specified.
        In a multi-tenant environment, the provider would be fetched from the tenant's settings.
        """
        # If no provider specified, fall back to environment variable or default
        if not provider:
            provider = os.environ.get("PAYMENT_PROVIDER", "paypal").lower()
            
        if provider == "paypal":
            return PayPalAdapter()
        # elif provider == "stripe":
        #     return StripeAdapter()
        # elif provider == "mock":
        #     return MockAdapter()
        else:
            raise ValueError(f"Unsupported payment provider: {provider}")
