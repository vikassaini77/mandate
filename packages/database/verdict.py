from enum import Enum
from pydantic import BaseModel
from typing import Optional

class Verdict(str, Enum):
    APPROVE = "APPROVE"
    ESCALATE = "ESCALATE"
    BLOCK = "BLOCK"

class Decision(BaseModel):
    verdict: Verdict
    rule_id: str
    reason: str
    details: Optional[dict] = None
    audit_hash: Optional[str] = None
