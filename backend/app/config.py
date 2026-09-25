import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    PROJECT_NAME: str = "Synthetix RAG Document Q&A API"
    VERSION: str = "1.0.0"
    
    # CORS Configuration
    # Set ALLOWED_ORIGINS in env as comma-separated string, e.g., "https://my-app.vercel.app,http://localhost:5173"
    ALLOWED_ORIGINS_RAW: str = "*"
    
    @property
    def allowed_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS_RAW or self.ALLOWED_ORIGINS_RAW.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_RAW.split(",") if origin.strip()]

    # Ingestion & Chunking
    CHUNK_SIZE: int = 2000
    CHUNK_OVERLAP: int = 200
    AUTO_INDEX_DEMO_DOC: bool = True
    
    # Vector Search & Embeddings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384
    SIMILARITY_THRESHOLD: float = 0.15  # Cosine similarity cut-off threshold for fallback
    TOP_K: int = 4
    FAISS_STORE_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "faiss_store")
    
    # LLM Settings
    # Supports 'groq', 'ollama', 'openai', 'fallback', or 'auto'
    LLM_PROVIDER: str = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    
    # Fallback model list for Groq in case of rate limits or model availability changes
    GROQ_FALLBACK_MODELS: List[str] = [
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768"
    ]
    
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-3.5-turbo"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
