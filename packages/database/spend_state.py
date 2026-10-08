from pydantic import BaseModel


class SpendState(BaseModel):
    current_monthly_spend: int = 0
    daily_purchase_count: int = 0
    current_daily_spend: int = 0
