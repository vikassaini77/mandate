import hashlib
import json
from typing import Any


class AuditHashChain:
    """
    Cryptographic Hash Chain for the Audit Log.
    Ensures that audit records (verdicts, amounts, timestamps) are tamper-evident.
    Each record's hash includes the hash of the previous record.
    """
    
    def __init__(self):
        self.chain = []
        self.last_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    def add_record(self, record_payload: dict[str, Any]) -> str:
        """
        Creates a new block in the hash chain and returns the cryptographic signature.
        """
        # Ensure deterministic ordering of the payload
        payload_str = json.dumps(record_payload, sort_keys=True)
        
        # Hash = SHA256(previous_hash + payload)
        hasher = hashlib.sha256()
        hasher.update(self.last_hash.encode('utf-8'))
        hasher.update(payload_str.encode('utf-8'))
        
        current_hash = hasher.hexdigest()
        
        block = {
            "payload": record_payload,
            "previous_hash": self.last_hash,
            "hash": current_hash
        }
        
        self.chain.append(block)
        self.last_hash = current_hash
        
        return current_hash

    def verify_chain(self) -> bool:
        """
        Iterates through the entire chain to verify cryptographic integrity.
        """
        expected_prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        for block in self.chain:
            if block["previous_hash"] != expected_prev_hash:
                return False
                
            payload_str = json.dumps(block["payload"], sort_keys=True)
            hasher = hashlib.sha256()
            hasher.update(expected_prev_hash.encode('utf-8'))
            hasher.update(payload_str.encode('utf-8'))
            
            if hasher.hexdigest() != block["hash"]:
                return False
                
            expected_prev_hash = block["hash"]
            
        return True

# Global instance for the hackathon demo
global_audit_chain = AuditHashChain()
