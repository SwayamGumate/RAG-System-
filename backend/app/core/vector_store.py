import os
import json
import hashlib
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple, Optional
from app.config import settings

class FAISSVectorStore:
    """FAISS vector store with disk persistence, metadata management, and deduplication."""
    
    def __init__(self, store_dir: str = settings.FAISS_STORE_DIR):
        self.store_dir = store_dir
        self.index_path = os.path.join(store_dir, "faiss_index.bin")
        self.metadata_path = os.path.join(store_dir, "metadata.json")
        self.dimension = settings.EMBEDDING_DIMENSION
        
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: List[Dict[str, Any]] = []
        self.documents: Dict[str, Dict[str, Any]] = {}  # doc_id -> doc_info
        
        self._initialize_store()

    def _initialize_store(self):
        """Create storage directory and initialize or load FAISS index and metadata."""
        os.makedirs(self.store_dir, exist_ok=True)
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            self.load_store()
        else:
            self._reset_index()

    def _reset_index(self):
        """Reset FAISS index and metadata structures."""
        # IndexFlatIP calculates Inner Product (equals Cosine Similarity for unit L2 vectors)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        self.documents = {}

    def save_store(self):
        """Persist FAISS index and metadata structures to disk."""
        if self.index is not None:
            faiss.write_index(self.index, self.index_path)
            
        data_to_save = {
            "metadata": self.metadata,
            "documents": self.documents
        }
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)

    def load_store(self):
        """Load FAISS index and metadata structures from disk."""
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.metadata = data.get("metadata", [])
                self.documents = data.get("documents", {})
        except Exception as e:
            # Fallback to fresh index if load fails
            self._reset_index()

    @staticmethod
    def compute_hash(text: str) -> str:
        """Compute SHA-256 hash of text content for duplicate detection."""
        return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()

    def is_duplicate_document(self, doc_hash: str) -> bool:
        """Check if document hash already exists in index."""
        return doc_hash in self.documents

    def add_document_chunks(
        self, 
        doc_id: str,
        filename: str, 
        chunks: List[Dict[str, Any]], 
        embeddings: np.ndarray,
        doc_hash: str,
        file_size: int
    ) -> Tuple[bool, str]:
        """
        Add chunk vectors and metadata to FAISS index.
        Returns (is_success, message).
        """
        if self.is_duplicate_document(doc_hash):
            return False, f"Document '{filename}' already exists in vector index."

        if len(chunks) == 0 or len(embeddings) == 0:
            return False, f"No content to index for '{filename}'."

        # Ensure embeddings are 2D float32 array
        embeddings_np = np.asarray(embeddings, dtype=np.float32)
        if embeddings_np.ndim == 1:
            embeddings_np = np.expand_dims(embeddings_np, axis=0)

        # Add to FAISS index
        start_idx = len(self.metadata)
        self.index.add(embeddings_np)

        # Register document metadata
        self.documents[doc_hash] = {
            "doc_id": doc_id,
            "doc_hash": doc_hash,
            "filename": filename,
            "chunk_count": len(chunks),
            "file_size": file_size,
            "created_at": str(np.datetime64('now'))
        }

        # Append metadata per chunk
        for idx, (chunk, vector) in enumerate(zip(chunks, embeddings_np)):
            chunk_entry = {
                "vector_id": start_idx + idx,
                "doc_id": doc_id,
                "doc_hash": doc_hash,
                "filename": filename,
                "chunk_index": chunk.get("chunk_index", idx),
                "text": chunk.get("text", ""),
                "char_count": chunk.get("char_count", 0),
                "approx_token_count": chunk.get("approx_token_count", 0)
            }
            self.metadata.append(chunk_entry)

        # Save store to disk
        self.save_store()
        return True, f"Successfully indexed {len(chunks)} chunks for '{filename}'."

    def search(self, query_vector: np.ndarray, top_k: int = settings.TOP_K) -> List[Dict[str, Any]]:
        """
        Perform similarity search using query vector.
        Returns list of matched chunk metadata dicts with 'similarity_score'.
        """
        if self.index is None or self.index.ntotal == 0 or len(self.metadata) == 0:
            return []

        query_vector_np = np.asarray(query_vector, dtype=np.float32)
        if query_vector_np.ndim == 1:
            query_vector_np = np.expand_dims(query_vector_np, axis=0)

        k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_vector_np, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self.metadata):
                continue
            chunk_meta = dict(self.metadata[idx])
            # Cosine similarity score range [0.0, 1.0] for normalized vectors
            sim_score = float(score)
            # Bound score between 0.0 and 1.0
            chunk_meta["similarity_score"] = round(max(0.0, min(1.0, sim_score)), 4)
            results.append(chunk_meta)

        return results

    def delete_document(self, doc_id: str) -> bool:
        """
        Delete document by doc_id and rebuild FAISS index.
        """
        target_hash = None
        for hash_val, doc_info in self.documents.items():
            if doc_info.get("doc_id") == doc_id:
                target_hash = hash_val
                break

        if not target_hash:
            return False

        # Find remaining chunks & recreate index
        remaining_metadata = [m for m in self.metadata if m.get("doc_id") != doc_id]
        
        # Delete document reference
        del self.documents[target_hash]

        if not remaining_metadata:
            self._reset_index()
            self.save_store()
            return True

        # Need embeddings of remaining metadata to rebuild FAISS index
        # Since we don't store raw vectors in metadata json, we can re-embed
        # or load existing vectors from current index before reset.
        from app.core.embeddings import embedding_manager
        
        texts_to_reembed = [m["text"] for m in remaining_metadata]
        new_embeddings = embedding_manager.encode(texts_to_reembed)
        
        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(new_embeddings)
        
        for new_idx, m in enumerate(remaining_metadata):
            m["vector_id"] = new_idx
            
        self.metadata = remaining_metadata
        self.save_store()
        return True

    def get_stats(self) -> Dict[str, Any]:
        """Return store statistics."""
        return {
            "total_documents": len(self.documents),
            "total_chunks": self.index.ntotal if self.index else 0,
            "documents": list(self.documents.values())
        }

    def clear_all(self):
        """Clear all indexed data and delete stored files."""
        self._reset_index()
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.metadata_path):
            os.remove(self.metadata_path)

vector_store = FAISSVectorStore()
