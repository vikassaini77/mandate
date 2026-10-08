import re


class DataSanitizer:
    # Basic list of prompt injection phrases
    IMPERATIVES = ["ignore previous instructions", "system override", "you must now", "new instructions"]
    
    @classmethod
    def sanitize_untrusted_data(cls, text: str) -> str:
        """
        1. Strip hidden text/zero-width chars
        2. Flag and strip imperatives
        3. Wrap in delimiters for LLM
        """
        if not text:
            return text
            
        # Strip zero-width characters (e.g. U+200B, U+200C, etc)
        text = re.sub(r'[\u200B-\u200D\uFEFF]', '', text)
        
        # Strip pseudo-role markers
        text = re.sub(r'(?i)(system:|assistant:|user:)', '', text)
        
        # Remove imperatives
        for imp in cls.IMPERATIVES:
            text = re.compile(re.escape(imp), re.IGNORECASE).sub('[REDACTED]', text)
            
        # Format as untrusted data block
        return f"\n<untrusted_data>\n{text}\n</untrusted_data>\n"

    @classmethod
    def score_risk(cls, text: str) -> float:
        """
        Placeholder for ML Section 7 risk scorer.
        Returns 0.0 to 1.0 risk score.
        High risk text should be quarantined.
        """
        risk = 0.0
        if "override" in text.lower() or "[REDACTED]" in text:
            risk = 0.9
        return risk
