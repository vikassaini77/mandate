from langchain.tools import BaseTool
from pydantic import BaseModel, Field
import httpx
from typing import Type

class ProposeTransactionSchema(BaseModel):
    amount: int = Field(description="The amount in cents")
    merchant: str = Field(description="The name of the merchant")
    description: str = Field(description="Description of the purchase")

class MandateTool(BaseTool):
    """
    Item 29: LangChain/LangGraph Integration
    Custom LangChain tool that binds any agent to Mandate's backend policy engine.
    """
    name = "mandate_propose_transaction"
    description = "Use this tool to propose a purchase transaction. The transaction will be securely vetted by the Mandate backend engine and human approval center before execution."
    args_schema: Type[BaseModel] = ProposeTransactionSchema
    
    api_key: str
    base_url: str = "http://localhost:8000/v1"

    def _run(self, amount: int, merchant: str, description: str) -> str:
        payload = {
            "amount_cents": amount,
            "merchant": merchant,
            "description": description
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        with httpx.Client() as client:
            response = client.post(f"{self.base_url}/transactions/propose", json=payload, headers=headers)
            
        if response.status_code == 200:
            return f"Transaction successfully proposed to Mandate. Status: {response.json().get('status', 'pending')}"
        else:
            return f"Failed to propose transaction. Error: {response.text}"

    async def _arun(self, amount: int, merchant: str, description: str) -> str:
        payload = {
            "amount_cents": amount,
            "merchant": merchant,
            "description": description
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/transactions/propose", json=payload, headers=headers)
            
        if response.status_code == 200:
            return f"Transaction successfully proposed to Mandate. Status: {response.json().get('status', 'pending')}"
        else:
            return f"Failed to propose transaction. Error: {response.text}"
