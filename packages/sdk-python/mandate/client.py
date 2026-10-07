import httpx
from typing import Dict, Any, Optional

class MandateClient:
    """
    Item 24: Python SDK
    Client library for interacting with the Mandate Developer Platform.
    """
    def __init__(self, api_key: str, base_url: str = "http://localhost:8000/v1"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.Client(headers={"Authorization": f"Bearer {self.api_key}"})

    def get_mandate(self, mandate_id: str) -> Dict[str, Any]:
        response = self.client.get(f"{self.base_url}/mandates/{mandate_id}")
        response.raise_for_status()
        return response.json()

    def kill_switch(self, mandate_id: str) -> Dict[str, Any]:
        response = self.client.post(f"{self.base_url}/mandates/{mandate_id}/kill")
        response.raise_for_status()
        return response.json()

    def propose_transaction(self, amount: int, merchant: str, description: str) -> Dict[str, Any]:
        payload = {
            "amount_cents": amount,
            "merchant": merchant,
            "description": description
        }
        response = self.client.post(f"{self.base_url}/transactions/propose", json=payload)
        response.raise_for_status()
        return response.json()
