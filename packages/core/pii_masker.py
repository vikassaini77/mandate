import re

class PIIMasker:
    """
    Enterprise PII Masking utility.
    Detects and masks sensitive data (SSN, Credit Cards, Emails) from LLM logs or outputs.
    Provides an audited reveal mechanism.
    """
    
    EMAIL_REGEX = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b'
    SSN_REGEX = r'\b\d{3}-\d{2}-\d{4}\b'
    CC_REGEX = r'\b(?:\d[ -]*?){13,16}\b'
    
    @classmethod
    def mask_text(cls, text: str) -> str:
        """Masks PII in a given string."""
        if not text:
            return text
            
        # Mask emails
        text = re.sub(cls.EMAIL_REGEX, "[EMAIL REDACTED]", text)
        # Mask SSNs
        text = re.sub(cls.SSN_REGEX, "[SSN REDACTED]", text)
        # Mask Credit Cards
        text = re.sub(cls.CC_REGEX, "[CARD REDACTED]", text)
        
        return text

    @classmethod
    def audited_reveal(cls, original_text: str, user_id: str, reason: str) -> str:
        """
        Reveals the PII but explicitly logs the access request to the system console/audit layer.
        """
        # In a real system, this would write to the DB
        print(f"[AUDIT LOG] PII Reveal requested by User: {user_id} | Reason: {reason}")
        return original_text
