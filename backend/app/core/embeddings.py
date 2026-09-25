import numpy as np
from typing import List, Union
from sentence_transformers import SentenceTransformer
from app.config import settings

class EmbeddingManager:
    """Singleton wrapper around SentenceTransformer model for generating embeddings."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingManager, cls).__new__(cls)
            cls._instance._model = None
        return cls._instance

    def _load_model(self):
        if self._model is None:
            # Load sentence-transformer model (all-MiniLM-L6-v2 produces 384-dim embeddings)
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            
    def get_embedding_dimension(self) -> int:
        return settings.EMBEDDING_DIMENSION

    def encode(self, texts: Union[str, List[str]], normalize: bool = True) -> np.ndarray:
        """
        Encode single text or list of texts into embedding vectors.
        Normalizes to unit L2 length by default for cosine similarity via dot product.
        """
        self._load_model()
        if isinstance(texts, str):
            texts = [texts]
            
        embeddings = self._model.encode(
            texts, 
            convert_to_numpy=True, 
            normalize_embeddings=normalize,
            show_progress_bar=False
        )
        
        return embeddings.astype(np.float32)

embedding_manager = EmbeddingManager()
