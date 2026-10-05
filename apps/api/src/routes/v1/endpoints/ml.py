from fastapi import APIRouter
from packages.ml.manager import MLManager

router = APIRouter()

@router.post("/seed")
async def seed_ml_model():
    """
    Instantly trains the Isolation Forest Anomaly Detection model.
    Generates 500 normal transactions and 50 anomalous ones for a quick demo.
    """
    try:
        count = MLManager.seed_anomaly_model()
        return {"status": "success", "message": f"Isolation Forest seeded with {count} transactions"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

from pydantic import BaseModel

class InjectionRequest(BaseModel):
    prompt: str

@router.post("/check-injection")
async def check_injection(req: InjectionRequest):
    """Evaluates a prompt against the Semantic Injection Defense model (FAISS)."""
    try:
        injection_model = MLManager._models.get('injection')
        if not injection_model:
            return {"status": "error", "message": "Injection model not loaded", "score": 0.0}
        
        score = injection_model.predict_proba(req.prompt)
        return {"status": "success", "score": score}
    except Exception as e:
        return {"status": "error", "message": str(e), "score": 0.0}

@router.get("/health")
async def get_ml_health():
    """Returns the current ML model load states"""
    return MLManager.get_health()
