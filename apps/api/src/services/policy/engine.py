from datetime import datetime
import asyncio
from packages.database.verdict import Decision, Verdict
from packages.database.mandate import MandateState
from packages.database.proposal import ProposalState
from packages.database.spend_state import SpendState
from apps.api.src.services.security_monitor import SecurityMonitor
from packages.ml.manager import MLManager

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

def _evaluate_rules(
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

    # Rule 10: Evasion Attack Logic (Velocity)
    if spend_state.daily_purchase_count >= mandate.rules.daily_purchase_count_cap:
        return Decision(
            verdict=Verdict.BLOCK,
            rule_id="RULE-10-EVASION-VELOCITY",
            reason=f"Blocked: Daily purchase count of {spend_state.daily_purchase_count} reaches the cap of {mandate.rules.daily_purchase_count_cap}. This prevents velocity-based evasion."
        )
        
    # Rule 11: Evasion Attack Logic (Structuring)
    # Detect if the agent is splitting a big purchase into multiple smaller ones just under the auto-approve limit.
    structuring_threshold = mandate.rules.auto_approve_limit * 0.9
    if proposal.amount >= structuring_threshold and proposal.amount <= mandate.rules.auto_approve_limit:
        if spend_state.daily_purchase_count >= 2:
            return Decision(
                verdict=Verdict.BLOCK,
                rule_id="RULE-11-EVASION-STRUCTURING",
                reason=f"Blocked: Detected structuring evasion attack. Proposal of {proposal.amount/100:.2f} is suspiciously close to the auto-approve limit of {mandate.rules.auto_approve_limit/100:.2f} while having multiple recent transactions."
            )

    # Rule 12: Otherwise APPROVE
    return Decision(
        verdict=Verdict.APPROVE,
        rule_id="RULE-12-APPROVE",
        reason=f"Approved: Proposal of {proposal.amount/100:.2f} from {proposal.merchant} passes all checks."
    )
def evaluate(
    mandate: MandateState, 
    proposal: ProposalState, 
    spend_state: SpendState, 
    now: datetime
) -> Decision:
    """
    Evaluates the proposal and fires WebSocket events to the frontend Security Monitor
    if a BLOCK or ESCALATE occurs.
    """
    # 3.2 Real-Time ML Scoring
    # Extract features from the live proposal context
    is_sketchy = proposal.amount > 100000 or "Unknown" in proposal.merchant
    
    score = MLManager.score_risk(
        text=f"{proposal.merchant} {proposal.category}",
        amount=float(proposal.amount) / 100.0,  # ML expects actual dollars
        hour_of_day=now.hour,
        category_novelty=1.0 if is_sketchy else 0.0,
        merchant_novelty=1.0 if is_sketchy else 0.0,
        velocity_1h=min(spend_state.daily_purchase_count, 10),
        velocity_24h=spend_state.daily_purchase_count
    )
    # Assign the score to the proposal so Rule 9 can evaluate it and it appears in audits
    proposal.ml_risk_score = round(score, 3)
    
    decision = _evaluate_rules(mandate, proposal, spend_state, now)
    
    # --- Item 11 & 14: Agent Trust Score & Quarantine ---
    if decision.verdict == Verdict.APPROVE:
        mandate.trust_score = min(100.0, mandate.trust_score + 2.0)
    elif decision.verdict == Verdict.ESCALATE:
        mandate.trust_score = max(0.0, mandate.trust_score - 10.0)
    elif decision.verdict == Verdict.BLOCK:
        mandate.trust_score = max(0.0, mandate.trust_score - 25.0)

    # Agent Quarantine Trigger
    if mandate.trust_score < 30.0 and not mandate.kill_switch_engaged:
        mandate.kill_switch_engaged = True
        decision.details = {"quarantine_triggered": True, "trust_score": mandate.trust_score}
    
    if decision.verdict in [Verdict.BLOCK, Verdict.ESCALATE]:
        payload = {
            "type": "threat_detected",
            "verdict": decision.verdict.value if hasattr(decision.verdict, 'value') else decision.verdict,
            "rule_id": decision.rule_id,
            "reason": decision.reason,
            "merchant": proposal.merchant,
            "amount": proposal.amount,
            "trust_score": mandate.trust_score,
            "timestamp": now.isoformat()
        }
        monitor = SecurityMonitor.get_instance()
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(monitor.emit_threat(payload))
        except RuntimeError:
            pass # Ignore if there is no running event loop

    # Write the immutable decision to the cryptographic audit chain
    from packages.database.hash_chain import global_audit_chain
    audit_payload = {
        "event": "POLICY_EVALUATION",
        "merchant": proposal.merchant,
        "amount": proposal.amount,
        "verdict": decision.verdict.value if hasattr(decision.verdict, 'value') else decision.verdict,
        "rule_id": decision.rule_id,
        "ml_risk_score": proposal.ml_risk_score,
        "trust_score_after": mandate.trust_score,
        "timestamp": now.isoformat()
    }
    decision.audit_hash = global_audit_chain.add_record(audit_payload)
            
    return decision
