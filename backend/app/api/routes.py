import uuid
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Query
from pydantic import BaseModel, Field

from app.core.ingestion import extract_text_from_file, recursive_character_chunking, IngestionError
from app.core.embeddings import embedding_manager
from app.core.vector_store import vector_store, FAISSVectorStore
from app.core.rag_engine import rag_engine
from app.config import settings

router = APIRouter(prefix="/api")

class QueryRequest(BaseModel):
    question: str = Field(..., description="User question string", min_length=1)
    top_k: Optional[int] = Field(default=settings.TOP_K, ge=1, le=10)

class CitationSchema(BaseModel):
    vector_id: int
    doc_id: str
    filename: str
    chunk_index: int
    text: str
    similarity_score: float

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationSchema]
    found_match: bool
    top_similarity_score: float
    execution_time_ms: float
    llm_provider: str

@router.post("/upload", status_code=status.HTTP_201_CREATED)

async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload and index PDF or TXT documents into the RAG FAISS vector store.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    upload_results = []
    
    for file in files:
        filename = file.filename or "uploaded_document"
        
        # Read raw bytes
        try:
            file_bytes = await file.read()
        except Exception as e:
            upload_results.append({
                "filename": filename,
                "status": "error",
                "message": f"Failed to read upload stream: {str(e)}"
            })
            continue

        file_size = len(file_bytes)

        # 1. Parse and extract text
        try:
            extracted_text = extract_text_from_file(file_bytes, filename)
        except IngestionError as ie:
            upload_results.append({
                "filename": filename,
                "status": "error",
                "message": str(ie)
            })
            continue

        # 2. Compute document hash for deduplication
        doc_hash = FAISSVectorStore.compute_hash(extracted_text)
        if vector_store.is_duplicate_document(doc_hash):
            upload_results.append({
                "filename": filename,
                "status": "duplicate",
                "message": f"Document '{filename}' already exists in index."
            })
            continue

        # 3. Recursive chunking (~500 tokens, 50-token overlap)
        chunks = recursive_character_chunking(
            extracted_text, 
            filename, 
            chunk_size=settings.CHUNK_SIZE, 
            chunk_overlap=settings.CHUNK_OVERLAP
        )

        if not chunks:
            upload_results.append({
                "filename": filename,
                "status": "error",
                "message": f"No valid chunks generated from '{filename}'."
            })
            continue

        # 4. Generate sentence-transformers embeddings
        chunk_texts = [c["text"] for c in chunks]
        embeddings = embedding_manager.encode(chunk_texts)

        # 5. Add to FAISS index
        doc_id = str(uuid.uuid4())
        success, msg = vector_store.add_document_chunks(
            doc_id=doc_id,
            filename=filename,
            chunks=chunks,
            embeddings=embeddings,
            doc_hash=doc_hash,
            file_size=file_size
        )

        if success:
            upload_results.append({
                "filename": filename,
                "doc_id": doc_id,
                "status": "success",
                "chunks_count": len(chunks),
                "message": msg
            })
        else:
            upload_results.append({
                "filename": filename,
                "status": "error",
                "message": msg
            })

    # If all uploads failed, return 400
    successful_uploads = [r for r in upload_results if r["status"] == "success"]
    if not successful_uploads and upload_results:
        errors = [r["message"] for r in upload_results]
        raise HTTPException(
            status_code=400, 
            detail=f"Upload failed: {'; '.join(errors)}"
        )

    return {
        "message": f"Processed {len(files)} file(s). Indexed {len(successful_uploads)} document(s).",
        "results": upload_results,
        "store_stats": vector_store.get_stats()
    }

@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Perform Q&A against indexed documents using FAISS retrieval and LLM context synthesis.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    result = await rag_engine.answer_question(
        question=request.question,
        top_k=request.top_k or settings.TOP_K
    )
    return result

@router.get("/documents")
async def get_documents():
    """Retrieve list of all indexed documents and store statistics."""
    return vector_store.get_stats()

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete document by doc_id and re-index store."""
    deleted = vector_store.delete_document(doc_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Document with ID '{doc_id}' not found.")
    return {
        "message": f"Document '{doc_id}' deleted successfully.",
        "store_stats": vector_store.get_stats()
    }

@router.delete("/clear")
async def clear_all_documents():
    """Clear all documents and FAISS vector index."""
    vector_store.clear_all()
    return {"message": "All documents and vector indices cleared successfully."}

@router.get("/health")
async def health_check():
    """System health check and pipeline status."""
    return {
        "status": "online",
        "version": settings.VERSION,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "embedding_dim": settings.EMBEDDING_DIMENSION,
        "faiss_total_chunks": vector_store.index.ntotal if vector_store.index else 0,
        "total_documents": len(vector_store.documents),
        "llm_provider": settings.LLM_PROVIDER
    }
