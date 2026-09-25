import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router as api_router
from app.core.ingestion import extract_text_from_file, recursive_character_chunking
from app.core.embeddings import embedding_manager
from app.core.vector_store import vector_store, FAISSVectorStore

def auto_index_demo_document():
    """Auto-index built-in demo document if vector store index is empty on startup."""
    try:
        if vector_store.documents or (vector_store.index and vector_store.index.ntotal > 0):
            return

        demo_path = os.path.join(os.path.dirname(__file__), "..", "data", "demo_document.txt")
        if not os.path.exists(demo_path):
            return

        with open(demo_path, "rb") as f:
            file_bytes = f.read()

        filename = "Synthetix_RAG_Overview.txt"
        extracted_text = extract_text_from_file(file_bytes, filename)
        doc_hash = FAISSVectorStore.compute_hash(extracted_text)

        chunks = recursive_character_chunking(
            extracted_text, 
            filename, 
            chunk_size=settings.CHUNK_SIZE, 
            chunk_overlap=settings.CHUNK_OVERLAP
        )

        if not chunks:
            return

        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_manager.encode(chunk_texts)

        doc_id = str(uuid.uuid4())
        vector_store.add_document_chunks(
            doc_id=doc_id,
            filename=filename,
            chunks=chunks,
            embeddings=embeddings,
            doc_hash=doc_hash,
            file_size=len(file_bytes)
        )
        print(f"[STARTUP] Successfully auto-indexed demo document '{filename}' ({len(chunks)} chunks).")
    except Exception as e:
        print(f"[STARTUP WARNING] Failed to auto-index demo document: {str(e)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: Auto-index demo doc on cold start if store is empty
    if settings.AUTO_INDEX_DEMO_DOC:
        auto_index_demo_document()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade RAG (Retrieval-Augmented Generation) Document Q&A API using FAISS and Groq LPU API.",
    lifespan=lifespan
)

# Universal CORS Middleware for seamless public frontend access across all domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME}",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
