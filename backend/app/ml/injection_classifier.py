import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

class InjectionClassifier:
    """
    Prompt-injection classifier.
    Baseline: TF-IDF + logistic regression.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=10000, ngram_range=(1, 2))
        self.model = LogisticRegression(class_weight='balanced')

    def fit(self, texts: list[str], labels: list[int]):
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)

    def predict_proba(self, text: str) -> float:
        X = self.vectorizer.transform([text])
        return self.model.predict_proba(X)[0][1] # Probability of class 1 (Injection)

    def save(self, directory: str):
        joblib.dump(self.vectorizer, os.path.join(directory, "injection_vectorizer.pkl"))
        joblib.dump(self.model, os.path.join(directory, "injection_model.pkl"))

    @classmethod
    def load(cls, directory: str) -> 'InjectionClassifier':
        inst = cls()
        inst.vectorizer = joblib.load(os.path.join(directory, "injection_vectorizer.pkl"))
        inst.model = joblib.load(os.path.join(directory, "injection_model.pkl"))
        return inst
