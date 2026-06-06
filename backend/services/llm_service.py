"""
LLM service using Groq (free tier).
Supports both streaming and non-streaming responses.

Sign up at: https://console.groq.com (free, no credit card needed)
"""

import logging
from typing import Generator, AsyncGenerator
from groq import Groq, AsyncGroq
from config import settings

logger = logging.getLogger(__name__)

# System prompt — customize this for each freelance client
SYSTEM_PROMPT = """You are DocuChat AI, an expert document assistant. Your job is to answer questions accurately based on the provided document context.

Guidelines:
- Answer ONLY from the provided context. Do not make up information.
- If the context doesn't contain the answer, say: "I don't have enough information in the uploaded documents to answer that."
- Always cite which document or section your answer comes from.
- Be concise but thorough.
- Use markdown formatting for better readability (bullet points, bold, code blocks where appropriate).
- If the user asks a follow-up question, maintain context from the conversation history."""


def build_rag_prompt(
    query: str,
    context_chunks: list[dict],
    chat_history: list[dict] = None,
) -> list[dict]:
    """
    Build the message list for the LLM including:
    - System prompt
    - Document context
    - Conversation history
    - Current query
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add document context
    if context_chunks:
        context_text = "\n\n---\n\n".join([
            f"[Source: {chunk['metadata'].get('document', 'Unknown')} | "
            f"Chunk {chunk['metadata'].get('chunk_index', 0) + 1}]\n{chunk['text']}"
            for chunk in context_chunks
        ])
        messages.append({
            "role": "user",
            "content": f"Here is the relevant document context:\n\n{context_text}",
        })
        messages.append({
            "role": "assistant",
            "content": "I have reviewed the document context. I'll use this to answer your questions accurately.",
        })
    else:
        messages.append({
            "role": "user",
            "content": "Note: No relevant document context was found. Please upload documents first.",
        })
        messages.append({
            "role": "assistant",
            "content": "I understand. I'll let you know if I can't find information in the uploaded documents.",
        })

    # Add conversation history (last 10 messages for context window management)
    if chat_history:
        for msg in chat_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add the current user query
    messages.append({"role": "user", "content": query})

    return messages


async def stream_response(
    query: str,
    context_chunks: list[dict],
    chat_history: list[dict] = None,
) -> AsyncGenerator[str, None]:
    """
    Stream the LLM response token by token.
    Yields text chunks as they arrive from Groq.
    """
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    messages = build_rag_prompt(query, context_chunks, chat_history)

    try:
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            max_tokens=2048,
            temperature=0.1,   # Low temperature for factual accuracy
            stream=True,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    except Exception as e:
        logger.error(f"LLM streaming error: {e}")
        yield f"\n\n[Error: Could not get response from AI. Please check your GROQ_API_KEY. Error: {str(e)}]"


async def get_response(
    query: str,
    context_chunks: list[dict],
    chat_history: list[dict] = None,
) -> str:
    """Non-streaming version — returns complete response as string."""
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    messages = build_rag_prompt(query, context_chunks, chat_history)

    response = await client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=2048,
        temperature=0.1,
    )
    return response.choices[0].message.content


async def generate_chat_title(first_message: str) -> str:
    """Auto-generate a concise title for a new chat session."""
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    response = await client.chat.completions.create(
        model="llama-3.1-8b-instant",  # Use fast model for this simple task
        messages=[
            {
                "role": "user",
                "content": f"Generate a short (max 6 words) title for a chat that starts with: '{first_message}'. Return ONLY the title, no quotes.",
            }
        ],
        max_tokens=20,
    )
    return response.choices[0].message.content.strip()
