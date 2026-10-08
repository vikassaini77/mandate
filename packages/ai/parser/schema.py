from pydantic import BaseModel, Field


class ParsedRules(BaseModel):
    allowed_categories: list[str] | None = None
    blocked_categories: list[str] | None = None
    blocked_merchants: list[str] | None = None
    monthly_cap_amount: int | None = Field(None, description="In minor units (cents)")
    daily_purchase_count_cap: int | None = None
    daily_amount_cap: int | None = Field(None, description="In minor units (cents)")
    auto_approve_limit: int | None = Field(None, description="In minor units (cents)")
    allowed_time_windows: list[str] | None = None

class ParsedMandate(BaseModel):
    rules: ParsedRules
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence in the extraction")
    assumptions: list[str] = Field(default_factory=list, description="Assumptions made during extraction")
    clarifying_questions: list[str] = Field(default_factory=list, description="Questions to ask user if text is ambiguous")
    missing_fields: list[str] = Field(default_factory=list, description="Important limits that were not found in the text")
