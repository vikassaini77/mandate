import os
import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

class AnomalyDetector:
    """
    Spend anomaly detector.
    Features: amount, time-of-day, category novelty, merchant novelty, velocity.
    Baseline: Isolation Forest.
    """
    def __init__(self):
        self.model = IsolationForest(contamination=0.05, random_state=42)
        self.feature_cols = ['amount', 'hour_of_day', 'category_novelty', 'merchant_novelty', 'velocity_1h', 'velocity_24h']

    def extract_features(self, df: pd.DataFrame) -> pd.DataFrame:
        # Assuming df contains raw event data, we map it to standard features
        # For this skeleton, we assume df already has the exact columns
        return df[self.feature_cols].fillna(0)

    def fit(self, df: pd.DataFrame):
        X = self.extract_features(df)
        self.model.fit(X)

    def predict_proba(self, features: dict) -> float:
        """
        Returns anomaly score mapped to 0-1 (0 = normal, 1 = highly anomalous)
        """
        df = pd.DataFrame([features])
        # Ensure all columns exist
        for col in self.feature_cols:
            if col not in df.columns:
                df[col] = 0.0
                
        X = self.extract_features(df)
        # Isolation Forest decision_function returns < 0 for anomalies, > 0 for normal.
        score = self.model.decision_function(X)[0]
        # Map roughly to 0-1 risk score (heuristics for baseline)
        risk = max(0.0, min(1.0, 0.5 - (score * 5)))
        return risk

    def explain(self, features: dict) -> dict:
        """
        Provides Explainable AI (SHAP-like) feature contributions for the prediction.
        """
        risk = self.predict_proba(features)
        
        # Calculate heuristics for mock explainability 
        amt = features.get('amount', 0)
        vel = features.get('velocity_24h', 0)
        cat = features.get('category_novelty', 0)
        
        # Normalize sum to risk
        raw_amt = amt / 10000.0
        raw_vel = vel / 5.0
        raw_cat = cat * 2.0
        
        total_raw = raw_amt + raw_vel + raw_cat + 0.001
        
        return {
            "risk_score": risk,
            "is_anomaly": risk > 0.7,
            "contributions": {
                "amount": round((raw_amt / total_raw) * risk, 2),
                "velocity": round((raw_vel / total_raw) * risk, 2),
                "category": round((raw_cat / total_raw) * risk, 2)
            }
        }

    def save(self, directory: str):
        joblib.dump(self.model, os.path.join(directory, "anomaly_model.pkl"))

    @classmethod
    def load(cls, directory: str) -> 'AnomalyDetector':
        inst = cls()
        inst.model = joblib.load(os.path.join(directory, "anomaly_model.pkl"))
        return inst
