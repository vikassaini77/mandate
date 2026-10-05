import asyncio
from datetime import datetime, timezone, timedelta
from packages.ml.manager import MLManager
from packages.database.mandate import MandateState, RuleConfig
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from apps.api.src.services.policy.engine import evaluate

async def run_test():
    # 1. Load the seeded models
    MLManager.load_models()
    
    # 2. Setup a permissive mandate
    rules = RuleConfig(
        blocked_merchants=[],
        blocked_categories=[],
        allowed_categories=[],
        daily_purchase_count_cap=100,
        daily_amount_cap=1000000,
        allowed_time_windows=[],
        auto_approve_limit=500000 # 
    )
    mandate = MandateState(
        is_active=True,
        kill_switch_engaged=False,
        supported_currencies=['USD'],
        monthly_cap_amount=10000000,
        rules=rules
    )
    spend = SpendState(current_monthly_spend=0, daily_purchase_count=1, current_daily_spend=0)
    
    # 3. Test Normal Transaction (e.g. 2 PM, )
    now_normal = datetime.now().replace(hour=14)
    prop_normal = ProposalState(
        id='p1', amount=5000, currency='USD', merchant='Starbucks', category='Food'
    )
    
    # 4. Test Hacker Transaction (e.g. 3 AM, , high velocity)
    now_hacker = datetime.now().replace(hour=3)
    spend_hacker = SpendState(current_monthly_spend=0, daily_purchase_count=20, current_daily_spend=0)
    prop_hacker = ProposalState(
        id='p2', amount=450000, currency='USD', merchant='Unknown LLC', category='Software'
    )
    
    dec1 = evaluate(mandate, prop_normal, spend, now_normal)
    dec2 = evaluate(mandate, prop_hacker, spend_hacker, now_hacker)
    
    print('--- NORMAL TRANSACTION ---')
    print(f'Risk Score: {prop_normal.ml_risk_score}')
    print(f'Verdict: {dec1.verdict} ({dec1.reason})')
    print('\n--- HACKER TRANSACTION ---')
    print(f'Risk Score: {prop_hacker.ml_risk_score}')
    print(f'Verdict: {dec2.verdict} ({dec2.reason})')

asyncio.run(run_test())
