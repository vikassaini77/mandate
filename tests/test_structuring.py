import asyncio
from datetime import datetime
from packages.database.mandate import MandateState, RuleConfig
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from packages.database.verdict import Verdict
from apps.api.src.services.policy.engine import evaluate

async def main():
    mandate = MandateState(
        monthly_cap_amount=1000000, 
        rules=RuleConfig(auto_approve_limit=15000, daily_purchase_count_cap=5)
    )
    
    print("--- NORMAL TRANSACTION ---")
    prop1 = ProposalState(
        id="prop-01", currency="USD", merchant="Stripe", category="Software", amount=12000, agent_reasoning="Normal software"
    )
    spend1 = SpendState(daily_purchase_count=0)
    decision1 = evaluate(mandate, prop1, spend1, datetime.now())
    print(f"Verdict 1: {decision1.verdict} - {decision1.reason}")

    print("\n--- STRUCTURING ATTACK ---")
    prop2 = ProposalState(
        id="prop-02", currency="USD", merchant="Stripe", category="Software", amount=14500, agent_reasoning="Splitting payment"
    )
    spend2 = SpendState(daily_purchase_count=2)
    decision2 = evaluate(mandate, prop2, spend2, datetime.now())
    print(f"Verdict 2: {decision2.verdict} - {decision2.reason}")

    print("\n--- VELOCITY EVASION ATTACK ---")
    prop3 = ProposalState(
        id="prop-03", currency="USD", merchant="Coffee", category="Office", amount=500, agent_reasoning="Coffee run"
    )
    spend3 = SpendState(daily_purchase_count=5)
    decision3 = evaluate(mandate, prop3, spend3, datetime.now())
    print(f"Verdict 3: {decision3.verdict} - {decision3.reason}")

asyncio.run(main())
