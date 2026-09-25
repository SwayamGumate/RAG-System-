import os
import sys
import tempfile
import pytest
import numpy as np

# Ensure backend root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.ingestion import recursive_character_chunking, extract_text_from_file, IngestionError
from app.core.embeddings import embedding_manager
from app.core.vector_store import FAISSVectorStore
from app.core.rag_engine import rag_engine

@pytest.fixture
def temp_vector_store():
    """Create a clean temporary FAISS vector store for testing."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        store = FAISSVectorStore(store_dir=tmp_dir)
        yield store


def test_chunking_correctness():
    """Verify recursive character chunking bounds and metadata structure."""
    sample_text = (
        "Retrieval-Augmented Generation (RAG) is an AI framework for improving the quality of LLM responses. "
        "It grounds the model on external sources of knowledge. "
        "RAG combines retrieval systems with generative models. "
        "By doing so, it avoids hallucination and provides verifiable source citations."
    )
    
    chunks = recursive_character_chunking(
        text=sample_text,
        filename="test.txt",
        chunk_size=120,
        chunk_overlap=30
    )
    
    assert len(chunks) > 0
    assert chunks[0]["filename"] == "test.txt"
    assert "text" in chunks[0]
    assert "chunk_index" in chunks[0]
    assert chunks[0]["chunk_index"] == 0
    
    # Ensure no individual chunk exceeds max character size threshold
    for chunk in chunks:
        assert len(chunk["text"]) <= 150  # Allows slight margin for word boundaries


def test_embedding_dimensions():
    """Verify sentence-transformers (all-MiniLM-L6-v2) generates exact 384-dimensional vector."""
    sample_phrase = "Artificial intelligence and neural network retrieval."
    embedding = embedding_manager.encode(sample_phrase)
    
    assert isinstance(embedding, np.ndarray)
    # Dimension of all-MiniLM-L6-v2 is strictly 384
    assert embedding.shape == (1, 384)
    assert embedding_manager.get_embedding_dimension() == 384


def test_retrieval_top_k(temp_vector_store):
    """Verify FAISS search returns requested top-k chunks with ordered similarity scores."""
    chunks = [
        {"chunk_index": 0, "text": "Deep learning models require GPUs for training.", "char_count": 45},
        {"chunk_index": 1, "text": "FAISS is a library for efficient similarity search of dense vectors.", "char_count": 68},
        {"chunk_index": 2, "text": "Python is a popular programming language for data science.", "char_count": 58},
        {"chunk_index": 3, "text": "Sentence Transformers encode text into dense vector representations.", "char_count": 67}
    ]
    
    texts = [c["text"] for c in chunks]
    embeddings = embedding_manager.encode(texts)
    
    success, msg = temp_vector_store.add_document_chunks(
        doc_id="doc_101",
        filename="ai_overview.txt",
        chunks=chunks,
        embeddings=embeddings,
        doc_hash="hash_101",
        file_size=1024
    )
    assert success is True
    
    # Query related to FAISS vector search
    query_vector = embedding_manager.encode("How does vector similarity search work in FAISS?")
    results = temp_vector_store.search(query_vector, top_k=2)
    
    assert len(results) == 2
    # Verify top result is related to FAISS
    assert "FAISS" in results[0]["text"] or "dense" in results[0]["text"]
    # Scores must be sorted in descending order
    assert results[0]["similarity_score"] >= results[1]["similarity_score"]


def test_no_match_fallback(temp_vector_store):
    """Verify question with no relevant match triggers fallback response rather than hallucination."""
    import asyncio
    
    # Index document about astrophysics
    chunks = [
        {"chunk_index": 0, "text": "Black holes possess event horizons from which light cannot escape.", "char_count": 65}
    ]
    embeddings = embedding_manager.encode([c["text"] for c in chunks])
    temp_vector_store.add_document_chunks("doc_astro", "astro.txt", chunks, embeddings, "hash_astro", 512)
    
    # Query completely unrelated domain (e.g. baking cake recipe)
    # Override global vector_store temporarily
    from app.core import rag_engine as re_module
    old_store = re_module.vector_store
    re_module.vector_store = temp_vector_store
    
    try:
        response = asyncio.run(rag_engine.answer_question("How do I bake a chocolate lava cake with vanilla icing?", top_k=2))
        assert response["found_match"] is False
        assert "not found in the uploaded document" in response["answer"].lower()
    finally:
        re_module.vector_store = old_store



def test_malformed_pdf_case():
    """Verify malformed or corrupt PDF file bytes raise clean IngestionError."""
    corrupt_pdf_bytes = b"%PDF-1.4 corrupt content that is not a valid PDF header or binary data structure..."
    
    with pytest.raises(IngestionError) as exc_info:
        extract_text_from_file(corrupt_pdf_bytes, "corrupt_file.pdf")
        
    assert "Failed to parse PDF file" in str(exc_info.value) or "corrupt" in str(exc_info.value)


def test_duplicate_upload(temp_vector_store):
    """Verify duplicate document upload is detected and rejected."""
    sample_text = "This is a unique test document for deduplication verification."
    chunks = [{"chunk_index": 0, "text": sample_text, "char_count": len(sample_text)}]
    embeddings = embedding_manager.encode([sample_text])
    doc_hash = "unique_hash_123"
    
    # First upload
    success1, _ = temp_vector_store.add_document_chunks("id1", "doc.txt", chunks, embeddings, doc_hash, 100)
    assert success1 is True
    
    # Duplicate upload attempt
    success2, msg2 = temp_vector_store.add_document_chunks("id2", "doc.txt", chunks, embeddings, doc_hash, 100)
    assert success2 is False
    assert "already exists" in msg2
