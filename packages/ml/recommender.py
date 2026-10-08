import json
import os

import faiss
from sentence_transformers import SentenceTransformer


class TwoTowerRecommender:
    """
    Two-tower retrieval model with FAISS.
    Item tower uses SentenceTransformers to build embeddings.
    """
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.encoder = SentenceTransformer(model_name)
        self.index = None
        self.item_ids = []

    def build_index(self, items: list[dict]):
        """
        Builds the FAISS index from the list of items.
        Each item is expected to have 'id' and 'text_representation'.
        """
        texts = [item['text_representation'] for item in items]
        self.item_ids = [item['id'] for item in items]
        
        embeddings = self.encoder.encode(texts, convert_to_numpy=True)
        dimension = embeddings.shape[1]
        
        # Inner product index for cosine similarity if normalized, 
        # or just L2 for basic similarity
        self.index = faiss.IndexFlatL2(dimension)
        self.index.add(embeddings)

    def search(self, query: str, top_k: int = 5) -> list[str]:
        if not self.index:
            return []
            
        query_embedding = self.encoder.encode([query], convert_to_numpy=True)
        distances, indices = self.index.search(query_embedding, top_k)
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.item_ids):
                results.append(self.item_ids[idx])
        return results

    def save(self, directory: str):
        faiss.write_index(self.index, os.path.join(directory, "recommender.index"))
        with open(os.path.join(directory, "recommender_ids.json"), "w") as f:
            json.dump(self.item_ids, f)

    @classmethod
    def load(cls, directory: str, model_name='all-MiniLM-L6-v2') -> 'TwoTowerRecommender':
        inst = cls(model_name)
        inst.index = faiss.read_index(os.path.join(directory, "recommender.index"))
        with open(os.path.join(directory, "recommender_ids.json"), "r") as f:
            inst.item_ids = json.load(f)
        return inst
