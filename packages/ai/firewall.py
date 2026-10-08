import logging

from packages.core.pii_masker import PIIMasker
from packages.ml.manager import MLManager

logger = logging.getLogger(__name__)

class AgentFirewall:
    """
    Item 18 & 19: Agent Firewall & Prompt-Injection Detection
    Acts as a reverse proxy for all LLM inputs and outputs.
    """
    
    @classmethod
    def inspect_inbound(cls, text: str) -> tuple[bool, str, str]:
        """
        Inspects inbound user prompts.
        Returns: (is_blocked, reason, masked_text)
        """
        # 1. PII Masking
        masked_text = PIIMasker.mask_text(text)
        
        # 2. Prompt Injection Detection via ML
        risk_score = MLManager.score_risk(masked_text)
        if risk_score > 0.85:
            logger.warning(f"FIREWALL BLOCKED: High injection risk score ({risk_score})")
            return True, f"Injection risk threshold exceeded ({risk_score:.2f})", masked_text
            
        # 3. Hardcoded heuristic fallbacks
        lower_text = masked_text.lower()
        if "ignore previous instructions" in lower_text or "system prompt" in lower_text:
            return True, "Jailbreak heuristic triggered", masked_text
            
        return False, "", masked_text
        
    @classmethod
    def authorize_tool_call(cls, agent_role: str, tool_name: str) -> bool:
        """
        Item 20: Tool-call authorization.
        Prevents hallucinated or unauthorized tools from executing.
        """
        ROLE_TOOL_MAP = {
            "ADMIN": ["delegate_task", "execute_sql_query", "search_handbook", "search_products", "propose_purchase", "check_budget"],
            "MANAGER": ["search_handbook", "search_products", "propose_purchase", "check_budget", "delegate_task"],
            "EMPLOYEE": ["search_handbook", "search_products", "propose_purchase", "check_budget"],
            "GUEST": ["search_products"]
        }
        
        allowed_tools = ROLE_TOOL_MAP.get(agent_role, [])
        if tool_name not in allowed_tools:
            logger.error(f"FIREWALL BLOCKED: Unauthorized tool call {tool_name} for role {agent_role}")
            return False
        return True
