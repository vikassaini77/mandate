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

@router.get("/health")
async def get_ml_health():
    """Returns the current ML model load states"""
    return MLManager.get_health()
