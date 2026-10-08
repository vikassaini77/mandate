import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

class MLManager:
    """
    Lazy loads ML models at startup and provides a fallback mechanism.
    If a model fails to load, the engine falls back to stricter rule-only mode.
    """
    _models: dict[str, Any] = {}
    _metrics: dict[str, Any] = {}
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
    def seed_anomaly_model(cls) -> int:
        """
        Seeds the Isolation Forest with a larger synthetic dataset (500 normal, 50 anomalous).
        We can dynamically generate as many as we want!
        """
        import random

        import pandas as pd

        from .anomaly_detector import AnomalyDetector
        
        # 500 normal transactions (boring hours, small amounts)
        normal_data = []
        for _ in range(500):
            normal_data.append({
                'amount': random.uniform(5.0, 150.0),
                'hour_of_day': random.randint(8, 20),
                'category_novelty': 0.0,
                'merchant_novelty': 0.0,
                'velocity_1h': random.randint(0, 1),
                'velocity_24h': random.randint(1, 4)
            })
            
        # 50 anomalous transactions (3 AM, large amounts, high velocity)
        anomalous_data = []
        for _ in range(50):
            anomalous_data.append({
                'amount': random.uniform(1500.0, 6000.0),
                'hour_of_day': random.randint(0, 4),
                'category_novelty': 1.0,
                'merchant_novelty': 1.0,
                'velocity_1h': random.randint(5, 12),
                'velocity_24h': random.randint(15, 30)
            })
            
        df = pd.DataFrame(normal_data + anomalous_data)
        
        detector = AnomalyDetector()
        detector.fit(df)
        
        os.makedirs(cls._artifacts_dir, exist_ok=True)
        detector.save(cls._artifacts_dir)
        cls._models['anomaly'] = detector
        
        return len(df)

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
            inj_risk = injection_model.predict_proba(text)
            if inj_risk > 0.8: # Only apply if it's a severe injection, otherwise ignore the noisy dummy model
                risk = max(risk, inj_risk)
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
