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

    def save(self, directory: str):
        joblib.dump(self.model, os.path.join(directory, "anomaly_model.pkl"))

    @classmethod
    def load(cls, directory: str) -> 'AnomalyDetector':
        inst = cls()
        inst.model = joblib.load(os.path.join(directory, "anomaly_model.pkl"))
        return inst
