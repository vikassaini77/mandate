from fastapi import APIRouter
from pydantic import BaseModel
from packages.ml.manager import MLManager
from packages.ml.faiss_injection import faiss_defense

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


class InjectionRequest(BaseModel):
    prompt: str


@router.post("/check-injection")
async def check_injection(req: InjectionRequest):
    """Evaluates a prompt against the Semantic Injection Defense model (FAISS)."""
    try:
        result = faiss_defense.evaluate(req.prompt)
        return {
            "status": "success",
            "score": result["score"],
            "verdict": result["verdict"],
            "cosine_similarity": result["cosine_similarity"],
            "closest_threat": result["closest_threat"],
        }
    except Exception as e:
        # Fallback to MLManager model if available
        injection_model = MLManager._models.get('injection')
        if injection_model:
            try:
                score = injection_model.predict_proba(req.prompt)
                return {"status": "success", "score": score}
            except Exception:
                pass
        return {"status": "error", "message": str(e), "score": 0.0}


@router.get("/health")
async def get_ml_health():
    """Returns the current ML model load states"""
    return MLManager.get_health()
