from fastapi import APIRouter
from packages.database.hash_chain import global_audit_chain
import time

router = APIRouter()

@router.get('/')
async def list_audit_events(skip: int = 0, limit: int = 100, search: str = None): 
    return {"data": global_audit_chain.chain}

@router.get('/export')
async def export_audit(format: str = 'csv'): 
    pass

@router.post('/seed-chain')
async def seed_chain():
    global_audit_chain.add_record({"event": "SYSTEM_BOOT", "timestamp": time.time()})
    global_audit_chain.add_record({"event": "POLICY_EVAL", "decision": "APPROVE", "amount": 14500})
    global_audit_chain.add_record({"event": "API_EXECUTE", "provider": "PAYPAL", "status": "SUCCESS"})
    return {"message": "Added 3 secure blocks to the chain.", "chain_length": len(global_audit_chain.chain)}

@router.post('/tamper-chain')
async def tamper_chain():
    if not global_audit_chain.chain:
        return {"error": "Chain is empty. Seed it first."}
    
    global_audit_chain.chain[1]["payload"]["amount"] = 99999
    return {"message": "Malicious tampering simulated! Hit /verify-chain to see detection."}

@router.post('/verify-chain')
async def verify_chain():
    is_valid = global_audit_chain.verify_chain()
    return {
        "status": "success",
        "intact": is_valid,
        "blocks_verified": len(global_audit_chain.chain),
        "message": "Merkle-tree cryptographic chain verified successfully." if is_valid else "TAMPERING DETECTED in the audit ledger!"
    }
