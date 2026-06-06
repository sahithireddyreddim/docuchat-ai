"""
RAG (Retrieval-Augmented Generation) orchestration service.
Connects document retrieval with the LLM to produce grounded answers.
"""

import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.document import Document, ChatSession, ChatMessage
from services.vector_store import query_documents
from services.llm_service import stream_response, get_response, generate_chat_title
from config import settings

logger = logging.getLogger(__name__)


async def get_relevant_context(
    user_id: int,
    query: str,
    document_ids: Optional[list[int]] = None,
) -> list[dict]:
    """Retrieve the most relevant document chunks for the user's query."""
    results = query_documents(
        user_id=user_id,
        query=query,
        top_k=settings.TOP_K_RESULTS,
        document_ids=document_ids,
    )
    logger.info(f"Retrieved {len(results)} relevant chunks for query")
    return results


async def get_chat_history(session_id: int, db: AsyncSession) -> list[dict]:
    """Load previous messages from a chat session."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in messages]


async def stream_rag_response(
    user_id: int,
    session_id: int,
    query: str,
    db: AsyncSession,
    document_ids: Optional[list[int]] = None,
) -> AsyncGenerator[str, None]:
    """
    Full RAG pipeline with streaming output.

    Steps:
    1. Retrieve relevant context from vector store
    2. Load conversation history
    3. Stream LLM response
    4. Save messages to database
    """
    # Step 1: Retrieve context
    context_chunks = await get_relevant_context(user_id, query, document_ids)

    # Step 2: Load history
    history = await get_chat_history(session_id, db)

    # Step 3: Save user message immediately
    user_message = ChatMessage(
        session_id=session_id,
        role="user",
        content=query,
    )
    db.add(user_message)
    await db.commit()

    # Step 4: Auto-title the session on first message
    if not history:
        try:
            title = await generate_chat_title(query)
            result = await db.execute(
                select(ChatSession).where(ChatSession.id == session_id)
            )
            session = result.scalar_one_or_none()
            if session:
                session.title = title
                await db.commit()
        except Exception as e:
            logger.warning(f"Could not generate title: {e}")

    # Step 5: Stream LLM response and collect full text
    full_response = ""

    # Yield sources first as metadata (frontend will parse this)
    if context_chunks:
        sources_data = [
            {
                "document": chunk["metadata"].get("document", "Unknown"),
                "document_id": chunk["metadata"].get("document_id"),
                "chunk_index": chunk["metadata"].get("chunk_index", 0),
                "score": chunk["score"],
                "preview": chunk["text"][:200] + "..." if len(chunk["text"]) > 200 else chunk["text"],
            }
            for chunk in context_chunks
        ]
        import json
        yield f"__SOURCES__{json.dumps(sources_data)}__SOURCES_END__\n"

    async for token in stream_response(query, context_chunks, history):
        full_response += token
        yield token

    # Step 6: Save assistant response to database
    assistant_message = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=full_response,
        sources=[
            {
                "document": c["metadata"].get("document"),
                "score": c["score"],
                "preview": c["text"][:200],
            }
            for c in context_chunks
        ] if context_chunks else None,
    )
    db.add(assistant_message)
    await db.commit()


async def create_session(user_id: int, db: AsyncSession) -> ChatSession:
    """Create a new chat session."""
    session = ChatSession(user_id=user_id, title="New Chat")
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session
