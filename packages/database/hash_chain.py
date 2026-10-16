import hashlib
import json
import os
from typing import Any


class AuditHashChain:
    """
    Cryptographic Hash Chain for the Audit Log.
    Ensures that audit records (verdicts, amounts, timestamps) are tamper-evident.
    Each record's hash includes the hash of the previous record.
    Persists cryptographically linked blocks to an append-only JSONL journal.
    """
    
    def __init__(self, persistence_file: str | None = None):
        self.chain: list[dict[str, Any]] = []
        self.last_hash = "0000000000000000000000000000000000000000000000000000000000000000"
        
        if persistence_file is None:
            persistence_file = os.path.join(os.path.dirname(__file__), "audit_chain.jsonl")
        self.persistence_file = persistence_file
        self._load_from_disk()

    def _load_from_disk(self):
        """Loads and cryptographically validates existing chain from disk."""
        if not os.path.exists(self.persistence_file):
            return

        try:
            with open(self.persistence_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    block = json.loads(line)
                    self.chain.append(block)
                    self.last_hash = block["hash"]
            
            # Verify chain integrity immediately on load
            if not self.verify_chain():
                print(f"WARNING: Audit hash chain at {self.persistence_file} failed integrity verification!")
        except Exception as e:
            print(f"Warning: Failed to load audit chain from {self.persistence_file}: {e}")

    def add_record(self, record_payload: dict[str, Any]) -> str:
        """
        Creates a new block in the hash chain, appends to the immutable file,
        and returns the cryptographic SHA-256 signature.
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
        
        # Append immediately to disk journal
        try:
            with open(self.persistence_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(block) + "\n")
        except Exception as e:
            print(f"Warning: Failed to write block to {self.persistence_file}: {e}")
        
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


# Global persistent instance for runtime policy evaluation
global_audit_chain = AuditHashChain()
