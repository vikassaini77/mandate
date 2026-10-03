from datetime import datetime
from app.domain.verdict import Decision, Verdict
from app.domain.mandate import MandateState
from app.domain.proposal import ProposalState
from app.domain.spend_state import SpendState

def is_within_time_window(time_windows: list[str], now: datetime) -> bool:
    """
    Checks if `now` falls within any of the allowed time windows (e.g. ['09:00-17:00']).
    """
    if not time_windows:
        return True # no restriction
    
    current_time = now.time()
    for window in time_windows:
        start_str, end_str = window.split("-")
        start_time = datetime.strptime(start_str.strip(), "%H:%M").time()
        end_time = datetime.strptime(end_str.strip(), "%H:%M").time()
        
        if start_time <= current_time <= end_time:
            return True
            
    return False

def evaluate(
    mandate: MandateState, 
    proposal: ProposalState, 
    spend_state: SpendState, 
    now: datetime
) -> Decision:
    """
    Deterministic Policy Engine.
    Evaluates rules in fixed order. First BLOCK wins -> ESCALATE wins -> APPROVE.
    """
    # Rule 1: Mandate active and not expired; agent not paused
    if not mandate.is_active:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-01-INACTIVE",
            reason="Blocked: The mandate is currently inactive."
        )
    if mandate.kill_switch_engaged:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-01-KILLED",
            reason="Blocked: The agent has been paused via kill switch."
        )
    if mandate.expires_at and now > mandate.expires_at:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-01-EXPIRED",
            reason=f"Blocked: The mandate expired on {mandate.expires_at.isoformat()}."
        )

    # Rule 2: Currency supported and amount > 0 and sane bounds
    if proposal.currency not in mandate.supported_currencies:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-02-CURRENCY",
            reason=f"Blocked: Currency {proposal.currency} is not supported. Allowed: {mandate.supported_currencies}."
        )
    if proposal.amount <= 0:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-02-AMOUNT",
            reason=f"Blocked: Proposed amount must be greater than 0. Got {proposal.amount}."
        )

    # Rule 3: Blocked merchant or blocked category
    if proposal.merchant in mandate.rules.blocked_merchants:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-03-MERCHANT",
            reason=f"Blocked: Merchant '{proposal.merchant}' is explicitly blocked."
        )
    if proposal.category in mandate.rules.blocked_categories:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-03-CATEGORY",
            reason=f"Blocked: Category '{proposal.category}' is explicitly blocked."
        )

    # Rule 4: Category not in allowed list
    if mandate.rules.allowed_categories and proposal.category not in mandate.rules.allowed_categories:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-04-CATEGORY",
            reason=f"Blocked: Category '{proposal.category}' is not in the allowed list: {mandate.rules.allowed_categories}."
        )

    # Rule 5: Monthly cap would be exceeded
    if spend_state.current_monthly_spend + proposal.amount > mandate.monthly_cap_amount:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-05-MONTHLY-CAP",
            reason=f"Blocked: {proposal.amount/100:.2f} would bring monthly spend to {(spend_state.current_monthly_spend + proposal.amount)/100:.2f}, over the {mandate.monthly_cap_amount/100:.2f} monthly cap."
        )

    # Rule 6: Daily purchase count or daily amount cap exceeded
    if spend_state.daily_purchase_count >= mandate.rules.daily_purchase_count_cap:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-06-DAILY-COUNT",
            reason=f"Blocked: Daily purchase count limit of {mandate.rules.daily_purchase_count_cap} has been reached."
        )
    if spend_state.current_daily_spend + proposal.amount > mandate.rules.daily_amount_cap:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-06-DAILY-CAP",
            reason=f"Blocked: {proposal.amount/100:.2f} would bring daily spend to {(spend_state.current_daily_spend + proposal.amount)/100:.2f}, over the {mandate.rules.daily_amount_cap/100:.2f} daily cap."
        )

    # Rule 7: Time-window restrictions violated
    if not is_within_time_window(mandate.rules.allowed_time_windows, now):
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-07-TIME-WINDOW",
            reason=f"Blocked: Current time {now.time().strftime('%H:%M')} is outside allowed operating windows {mandate.rules.allowed_time_windows}."
        )

    # Rule 8: Amount > auto-approve limit
    if proposal.amount > mandate.rules.auto_approve_limit:
        return Decision(
            verdict=Verdict.ESCALATE,
            rule_id="RULE-08-AUTO-APPROVE",
            reason=f"Escalated: The proposed amount {proposal.amount/100:.2f} exceeds the auto-approval limit of {mandate.rules.auto_approve_limit/100:.2f}."
        )

    # Rule 9: ML risk score above threshold (e.g. 0.8)
    if proposal.ml_risk_score > 0.8:
        return Decision(
            verdict=Verdict.ESCALATE,
            rule_id="RULE-09-ML-RISK",
            reason=f"Escalated: The ML risk score of {proposal.ml_risk_score} exceeds the threshold of 0.8."
        )

    # Rule 10: Otherwise APPROVE
    return Decision(
        verdict=Verdict.APPROVE,
        rule_id="RULE-10-APPROVE",
        reason=f"Approved: Proposal of {proposal.amount/100:.2f} from {proposal.merchant} passes all checks."
    )
