from pydantic import BaseModel
from typing import Optional

class ProposalState(BaseModel):
    id: str
    amount: int
    currency: str
    merchant: str
    category: str
    ml_risk_score: float = 0.0 # 0.0 to 1.0
