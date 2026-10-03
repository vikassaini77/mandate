import pytest
from datetime import datetime, timezone
from hypothesis import given, strategies as st
from copy import deepcopy

from app.domain.verdict import Verdict, Decision
from app.domain.mandate import MandateState, RuleConfig
from app.domain.proposal import ProposalState
from app.domain.spend_state import SpendState
from app.policy.engine import evaluate

# Strategies for generating random but valid test data
st_amounts = st.integers(min_value=1, max_value=1_000_000)
st_ml_scores = st.floats(min_value=0.0, max_value=1.0)
st_categories = st.sampled_from(["Electronics", "Office", "Apparel", "Software"])
st_merchants = st.sampled_from(["Amazon", "Apple", "Unknown vendor", "Nike"])
st_currencies = st.sampled_from(["USD", "EUR", "GBP"])

@st.composite
def mandate_strategy(draw):
    rules = RuleConfig(
        allowed_categories=draw(st.lists(st_categories, max_size=3, unique=True)),
        blocked_categories=["Apparel"],
        blocked_merchants=["Unknown vendor"],
        daily_purchase_count_cap=draw(st.integers(min_value=1, max_value=10)),
        daily_amount_cap=draw(st.integers(min_value=1000, max_value=50000)),
        auto_approve_limit=draw(st.integers(min_value=1000, max_value=20000)),
        allowed_time_windows=["00:00-23:59"]
    )
    return MandateState(
        is_active=draw(st.booleans()),
        kill_switch_engaged=draw(st.booleans()),
        monthly_cap_amount=draw(st.integers(min_value=10000, max_value=100_000)),
        supported_currencies=["USD"],
        rules=rules
    )

@st.composite
def proposal_strategy(draw):
    return ProposalState(
        id="prop-123",
        amount=draw(st_amounts),
        currency=draw(st_currencies),
        merchant=draw(st_merchants),
        category=draw(st_categories),
        ml_risk_score=draw(st_ml_scores)
    )

@st.composite
def spend_state_strategy(draw):
    return SpendState(
        current_monthly_spend=draw(st.integers(min_value=0, max_value=100_000)),
        daily_purchase_count=draw(st.integers(min_value=0, max_value=10)),
        current_daily_spend=draw(st.integers(min_value=0, max_value=50000))
    )

@given(mandate_strategy(), proposal_strategy(), spend_state_strategy())
def test_same_input_same_output(mandate, proposal, spend):
    now = datetime(2026, 10, 3, 12, 0, tzinfo=timezone.utc)
    decision1 = evaluate(mandate, proposal, spend, now)
    decision2 = evaluate(mandate, proposal, spend, now)
    assert decision1 == decision2

@given(mandate_strategy(), proposal_strategy(), spend_state_strategy())
def test_ml_can_never_make_decision_looser(mandate, proposal, spend):
    now = datetime(2026, 10, 3, 12, 0, tzinfo=timezone.utc)
    
    # Evaluate with original ML score
    base_decision = evaluate(mandate, proposal, spend, now)
    
    # Increase ML score (higher risk)
    worse_proposal = deepcopy(proposal)
    worse_proposal.ml_risk_score = 1.0 
    worse_decision = evaluate(mandate, worse_proposal, spend, now)
    
    # If base was BLOCK, worse must be BLOCK
    if base_decision.verdict == Verdict.BLOCK:
        assert worse_decision.verdict == Verdict.BLOCK
        
    # If base was ESCALATE, worse must be ESCALATE or BLOCK
    if base_decision.verdict == Verdict.ESCALATE:
        assert worse_decision.verdict in [Verdict.ESCALATE, Verdict.BLOCK]
        
    # If base was APPROVE, worse can be anything depending on the threshold
    # But a higher risk score can never turn a BLOCK/ESCALATE into an APPROVE
    if base_decision.verdict in [Verdict.BLOCK, Verdict.ESCALATE]:
        assert worse_decision.verdict != Verdict.APPROVE

@given(mandate_strategy(), proposal_strategy(), spend_state_strategy())
def test_spend_never_exceeds_cap(mandate, proposal, spend):
    now = datetime(2026, 10, 3, 12, 0, tzinfo=timezone.utc)
    
    # If the proposal amount + current spend > cap, it must be BLOCKED
    if spend.current_monthly_spend + proposal.amount > mandate.monthly_cap_amount:
        decision = evaluate(mandate, proposal, spend, now)
        assert decision.verdict == Verdict.BLOCK
        assert decision.rule_id == "RULE-05-MONTHLY-CAP"
