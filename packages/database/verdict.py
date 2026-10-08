from enum import Enum

from pydantic import BaseModel


class Verdict(str, Enum):
    APPROVE = "APPROVE"
    ESCALATE = "ESCALATE"
    BLOCK = "BLOCK"

class Decision(BaseModel):
    verdict: Verdict
    rule_id: str
    reason: str
    details: dict | None = None
    audit_hash: str | None = None
