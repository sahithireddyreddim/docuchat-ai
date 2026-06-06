"""Document upload and management routes."""

import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from database import get_db
from models.user import User
from models.document import Document
from utils.auth_utils import get_current_user
from utils.file_utils import validate_file, save_upload_file, delete_file, get_file_path, get_file_extension
from services.document_processor import extract_text, split_into_chunks
from services.vector_store import add_document_chunks, delete_document_from_store, get_collection_stats

router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)


async def process_document_background(
    document_id: int,
    file_path: str,
    file_type: str,
    original_name: str,
    user_id: int,
    db: AsyncSession,
):
    """Background task: extract text, chunk it, embed it into vector store."""
    try:
        # Extract text
        text = extract_text(file_path, file_type)

        if not text.strip():
            raise ValueError("No text could be extracted from this document")

        # Split into chunks
        chunks = split_into_chunks(text, original_name)

        # Add to vector store
        chunk_count = add_document_chunks(user_id, document_id, chunks)

        # Update document record
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if doc:
            doc.is_processed = True
            doc.chunk_count = chunk_count
            doc.collection_name = f"user_{user_id}_docs"
            await db.commit()

        logger.info(f"Document {document_id} processed: {chunk_count} chunks")

    except Exception as e:
        logger.error(f"Document processing failed for {document_id}: {e}")
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if doc:
            doc.processing_error = str(e)
            await db.commit()


@router.post("/upload", status_code=201)
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload one or more documents for processing."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per upload")

    uploaded = []

    for file in files:
        validate_file(file)
        ext = get_file_extension(file.filename)

        saved_name, file_size = await save_upload_file(file, current_user.id)
        file_path = get_file_path(current_user.id, saved_name)

        doc = Document(
            user_id=current_user.id,
            filename=saved_name,
            original_name=file.filename,
            file_type=ext,
            file_size=file_size,
            is_processed=False,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        # Process in background so upload returns immediately
        background_tasks.add_task(
            process_document_background,
            doc.id,
            file_path,
            ext,
            file.filename,
            current_user.id,
            db,
        )

        uploaded.append({
            "id": doc.id,
            "name": file.filename,
            "size": file_size,
            "status": "processing",
        })

    return {"uploaded": uploaded, "message": f"{len(uploaded)} file(s) queued for processing"}


@router.get("/")
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents for the current user."""
    result = await db.execute(
        select(Document)
        .where(Document.user_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    docs = result.scalars().all()

    return [
        {
            "id": d.id,
            "name": d.original_name,
            "type": d.file_type,
            "size": d.file_size,
            "chunks": d.chunk_count,
            "processed": d.is_processed,
            "error": d.processing_error,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.get("/{doc_id}/status")
async def document_status(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check the processing status of a document."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": doc.id,
        "processed": doc.is_processed,
        "chunks": doc.chunk_count,
        "error": doc.processing_error,
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document and its vector store embeddings."""
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == current_user.id)
    )
    doc = result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from vector store
    delete_document_from_store(current_user.id, doc_id)

    # Remove file from disk
    delete_file(current_user.id, doc.filename)

    # Remove from database
    await db.delete(doc)
    await db.commit()

    return {"message": f"Document '{doc.original_name}' deleted successfully"}


@router.get("/stats/summary")
async def document_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get document statistics for the current user."""
    result = await db.execute(
        select(func.count(Document.id)).where(Document.user_id == current_user.id)
    )
    total_docs = result.scalar()

    vector_stats = get_collection_stats(current_user.id)

    return {
        "total_documents": total_docs,
        "total_chunks": vector_stats["total_chunks"],
    }
