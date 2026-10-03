import json
from typing import List, Optional
from pydantic import BaseModel, Field

class ParsedRules(BaseModel):
    allowed_categories: Optional[List[str]] = None
    blocked_categories: Optional[List[str]] = None
    blocked_merchants: Optional[List[str]] = None
    monthly_cap_amount: Optional[int] = Field(None, description="In minor units (cents)")
    daily_purchase_count_cap: Optional[int] = None
    daily_amount_cap: Optional[int] = Field(None, description="In minor units (cents)")
    auto_approve_limit: Optional[int] = Field(None, description="In minor units (cents)")
    allowed_time_windows: Optional[List[str]] = None

class ParsedMandate(BaseModel):
    rules: ParsedRules
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in the extraction")
    assumptions: List[str] = Field(default_factory=list, description="Assumptions made during extraction")
    clarifying_questions: List[str] = Field(default_factory=list, description="Questions to ask user if text is ambiguous")
    missing_fields: List[str] = Field(default_factory=list, description="Important limits that were not found in the text")
