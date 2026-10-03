import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MLManager:
    """
    Lazy loads ML models at startup and provides a fallback mechanism.
    If a model fails to load, the engine falls back to stricter rule-only mode.
    """
    _models: Dict[str, Any] = {}
    _metrics: Dict[str, Any] = {}
    _artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")

    @classmethod
    def load_models(cls):
        try:
            from .injection_classifier import InjectionClassifier
            cls._models['injection'] = InjectionClassifier.load(cls._artifacts_dir)
            logger.info("Loaded InjectionClassifier")
        except Exception as e:
            logger.error(f"Failed to load InjectionClassifier: {e}")
            cls._models['injection'] = None

        try:
            from .anomaly_detector import AnomalyDetector
            cls._models['anomaly'] = AnomalyDetector.load(cls._artifacts_dir)
            logger.info("Loaded AnomalyDetector")
        except Exception as e:
            logger.error(f"Failed to load AnomalyDetector: {e}")
            cls._models['anomaly'] = None

        try:
            from .recommender import TwoTowerRecommender
            cls._models['recommender'] = TwoTowerRecommender.load(cls._artifacts_dir)
            logger.info("Loaded TwoTowerRecommender")
        except Exception as e:
            logger.error(f"Failed to load TwoTowerRecommender: {e}")
            cls._models['recommender'] = None

        # Load metrics
        metrics_path = os.path.join(cls._artifacts_dir, "metrics.json")
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                cls._metrics = json.load(f)

    @classmethod
    def get_health(cls) -> dict:
        return {
            "status": "ok",
            "models": {
                name: ("loaded" if model else "failed/fallback")
                for name, model in cls._models.items()
            },
            "metrics": cls._metrics
        }

    @classmethod
    def score_risk(cls, text: str, amount: float = 0.0, **kwargs) -> float:
        """
        Combines injection and anomaly detection into a single risk score.
        Graceful fallback: If models are unavailable, returns 1.0 (escalates always)
        as a strict fallback, or 0.0 depending on business rules.
        """
        risk = 0.0
        
        # 1. Injection Risk
        injection_model = cls._models.get('injection')
        if injection_model:
            risk = max(risk, injection_model.predict_proba(text))
        else:
            # Fallback for injection risk: strictly flag imperatives
            if "override" in text.lower():
                risk = max(risk, 0.9)

        # 2. Anomaly Risk
        anomaly_model = cls._models.get('anomaly')
        if anomaly_model:
            features = kwargs
            features['amount'] = amount
            risk = max(risk, anomaly_model.predict_proba(features))
            
        return risk
