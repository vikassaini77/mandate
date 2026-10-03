from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RuleConfig(BaseModel):
    allowed_categories: List[str] = Field(default_factory=list)
    blocked_categories: List[str] = Field(default_factory=list)
    blocked_merchants: List[str] = Field(default_factory=list)
    daily_purchase_count_cap: int = 5
    daily_amount_cap: int = 50000 # minor units (cents)
    auto_approve_limit: int = 15000 # minor units (cents)
    allowed_time_windows: List[str] = Field(default_factory=lambda: ["00:00-23:59"])

class MandateState(BaseModel):
    is_active: bool = True
    expires_at: Optional[datetime] = None
    kill_switch_engaged: bool = False
    monthly_cap_amount: int # minor units
    currency: str = "USD"
    supported_currencies: List[str] = Field(default_factory=lambda: ["USD"])
    rules: RuleConfig
