"""
Application configuration using Pydantic Settings.
All values can be overridden via environment variables or .env file.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DocuChat AI"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = "change-this-to-a-long-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # LLM (Groq - free tier at console.groq.com)
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"  # Fast, free model

    # Embeddings (runs locally, no API key needed)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./docuchat.db"

    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: list = [".pdf", ".docx", ".txt"]

    # ChromaDB
    CHROMA_DIR: str = "chroma_db"

    # RAG Settings
    CHUNK_SIZE: int = 1000       # Characters per chunk
    CHUNK_OVERLAP: int = 200     # Overlap between chunks
    TOP_K_RESULTS: int = 5       # Number of chunks to retrieve
    SIMILARITY_THRESHOLD: float = 0.0   # Min similarity score (lower = more results)

    # CORS (update for production)
    CORS_ORIGINS: list = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cache settings so they're only read once."""
    return Settings()


settings = get_settings()
