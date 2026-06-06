"""
ChromaDB vector store service.
Uses ChromaDB's built-in embedding function - no sentence-transformers needed.
Much lighter on RAM, works on low-memory servers and PCs.
"""

import logging
from typing import Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions

from config import settings

logger = logging.getLogger(__name__)

_chroma_client: Optional[chromadb.Client] = None

# Built-in embedding - no extra model download, uses ~50MB RAM instead of 500MB
_embedding_fn = embedding_functions.DefaultEmbeddingFunction()


def get_chroma_client() -> chromadb.Client:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=settings.CHROMA_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def get_collection_name(user_id: int) -> str:
    return f"user_{user_id}_docs"


def add_document_chunks(user_id: int, document_id: int, chunks: list[dict]) -> int:
    if not chunks:
        return 0

    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name=get_collection_name(user_id),
        embedding_function=_embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )

    texts = [c["text"] for c in chunks]
    metadatas = [{**c["metadata"], "document_id": str(document_id)} for c in chunks]
    ids = [f"doc_{document_id}_chunk_{i}" for i in range(len(chunks))]

    collection.add(documents=texts, metadatas=metadatas, ids=ids)
    return len(chunks)


def query_documents(
    user_id: int,
    query: str,
    top_k: int = None,
    document_ids: Optional[list[int]] = None,
) -> list[dict]:
    top_k = top_k or settings.TOP_K_RESULTS
    client = get_chroma_client()

    try:
        collection = client.get_collection(
            get_collection_name(user_id),
            embedding_function=_embedding_fn,
        )
    except Exception:
        return []

    count = collection.count()
    if count == 0:
        return []

    where_filter = None
    if document_ids:
        where_filter = {"document_id": {"$in": [str(d) for d in document_ids]}}

    results = collection.query(
        query_texts=[query],
        n_results=min(top_k, count),
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    output = []
    if results["documents"] and results["documents"][0]:
        for text, meta, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            similarity = 1 - distance
            if similarity >= settings.SIMILARITY_THRESHOLD:
                output.append({
                    "text": text,
                    "metadata": meta,
                    "score": round(similarity, 4),
                })

    return output


def delete_document_from_store(user_id: int, document_id: int) -> None:
    client = get_chroma_client()
    try:
        collection = client.get_collection(
            get_collection_name(user_id),
            embedding_function=_embedding_fn,
        )
        collection.delete(where={"document_id": str(document_id)})
    except Exception as e:
        logger.warning(f"Could not delete from vector store: {e}")


def get_collection_stats(user_id: int) -> dict:
    client = get_chroma_client()
    try:
        collection = client.get_collection(
            get_collection_name(user_id),
            embedding_function=_embedding_fn,
        )
        return {"total_chunks": collection.count(), "collection": get_collection_name(user_id)}
    except Exception:
        return {"total_chunks": 0, "collection": get_collection_name(user_id)}
