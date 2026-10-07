from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from pydantic import BaseModel

class PaymentIntent(BaseModel):
    id: str
    status: str
    amount_cents: int
    currency: str
    provider_raw: Dict[str, Any]

class PaymentGateway(ABC):
    """
    Abstract Base Class representing a standardized interface for all payment gateways.
    Implementations (PayPal, Stripe, Mock) must conform to this interface.
    """
    
    @abstractmethod
    async def create_intent(
        self, 
        amount_cents: int, 
        currency: str, 
        reference_id: str, 
        idempotency_key: Optional[str] = None
    ) -> PaymentIntent:
        """Creates a payment intent/order that the user will approve."""
        pass

    @abstractmethod
    async def capture_intent(
        self, 
        intent_id: str, 
        idempotency_key: Optional[str] = None
    ) -> PaymentIntent:
        """Captures the funds after user approval."""
        pass

    @abstractmethod
    async def get_intent(self, intent_id: str) -> PaymentIntent:
        """Retrieves the status of a payment intent."""
        pass

    @abstractmethod
    async def refund(
        self, 
        capture_id: str, 
        amount_cents: Optional[int] = None, 
        currency: Optional[str] = None, 
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Refunds a captured payment."""
        pass
