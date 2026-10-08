import os

from anthropic import AsyncAnthropic
from pydantic import BaseModel


class Product(BaseModel):
    id: str
    name: str
    price: float
    merchant: str
    category: str

class LLMRequest(BaseModel):
    prompt: str

# Define a tool schema for anthropic
PROPOSE_PRODUCT_TOOL = {
    "name": "propose_product",
    "description": "Proposes a product purchase based on user requirements.",
    "input_schema": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "name": {"type": "string"},
            "price": {"type": "number"},
            "merchant": {"type": "string"},
            "category": {"type": "string"}
        },
        "required": ["id", "name", "price", "merchant", "category"]
    }
}

class MLProposer:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.client = AsyncAnthropic(api_key=self.api_key)
        else:
            self.client = None

        # Example ML components (mocked setup)
        # self.encoder = sentence_transformers.SentenceTransformer('all-MiniLM-L6-v2')
        # self.index = faiss.IndexFlatL2(384)

    async def propose_purchase(self, request: LLMRequest) -> Product:
        """
        The LLM Proposes a purchase.
        Uses Anthropic tool calling to output structured JSON matching the Product schema.
        """
        if not self.client:
            # Fallback mock for local development without API key
            prompt = request.prompt.lower()
            if "keyboard" in prompt:
                return Product(
                    id="kb-123",
                    name="Graphite 68 Keyboard",
                    price=129.0,
                    merchant="Keyworks",
                    category="Electronics"
                )
            elif "malicious" in prompt:
                return Product(
                    id="gift-card-001",
                    name="Digital Gift Card",
                    price=100.0,
                    merchant="Unknown vendor",
                    category="Gift Cards"
                )
            else:
                return Product(
                    id="generic-123",
                    name="Generic Office Supply",
                    price=45.0,
                    merchant="Amazon Business",
                    category="Office"
                )

        # Real Anthropic call
        response = await self.client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
            max_tokens=1024,
            tools=[PROPOSE_PRODUCT_TOOL],
            tool_choice={"type": "tool", "name": "propose_product"},
            messages=[
                {
                    "role": "user",
                    "content": f"User prompt: {request.prompt}\n\nPlease propose a single product that fulfills this request using the propose_product tool."
                }
            ]
        )

        for content in response.content:
            if content.type == "tool_use" and content.name == "propose_product":
                return Product(**content.input)

        raise ValueError("LLM did not return a valid product proposal.")
