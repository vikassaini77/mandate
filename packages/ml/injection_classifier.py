import os
from transformers import pipeline

class InjectionClassifier:
    """
    Semantic prompt-injection classifier (Feature 4.1).
    Uses deepset/deberta-v3-base-injection, a true neural classifier fine-tuned 
    specifically on tens of thousands of prompt injection attacks.
    """
    def __init__(self):
        # We load a massive fine-tuned LLM brain explicitly trained for prompt injections
        # It downloads to the HuggingFace cache (~500MB) on first boot.
        self.classifier = pipeline("text-classification", model="deepset/deberta-v3-base-injection")

    def fit(self, texts: list[str], labels: list[int]):
        # Not needed. The DeBERTa brain is already fully trained.
        pass

    def predict_proba(self, text: str) -> float:
        """
        Returns a risk score between 0.0 and 1.0 based on the model's neural evaluation
        of malicious injection intent.
        """
        # Max length constraint for DeBERTa is usually 512 tokens
        # We truncate the input just in case it's a massive prompt
        result = self.classifier(text[:2000], truncation=True, max_length=512)[0]
        
        # result looks like: {'label': 'INJECTION', 'score': 0.998}
        if result['label'] == 'INJECTION':
            return result['score']
        
        # If it's labeled LEGITIMATE, the "injection risk" is inverted
        return 1.0 - result['score']

    def save(self, directory: str):
        # We don't save the weights locally, the huggingface cache handles it!
        pass

    @classmethod
    def load(cls, directory: str) -> 'InjectionClassifier':
        return cls()
