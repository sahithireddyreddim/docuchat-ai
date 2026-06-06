"""Admin routes for managing users, documents, and the vector store."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from database import get_db
from models.user import User
from models.document import Document, ChatSession, ChatMessage
from utils.auth_utils import get_admin_user
from services.vector_store import get_collection_stats

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_platform_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Platform-wide statistics dashboard."""
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar()
    total_sessions = (await db.execute(select(func.count(ChatSession.id)))).scalar()
    total_messages = (await db.execute(select(func.count(ChatMessage.id)))).scalar()
    processed_docs = (
        await db.execute(select(func.count(Document.id)).where(Document.is_processed == True))
    ).scalar()

    return {
        "users": total_users,
        "documents": {"total": total_docs, "processed": processed_docs},
        "chats": {"sessions": total_sessions, "messages": total_messages},
    }


@router.get("/users")
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/documents")
async def list_all_documents(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all documents across all users."""
    result = await db.execute(
        select(Document, User.username)
        .join(User)
        .order_by(Document.created_at.desc())
    )
    rows = result.all()

    return [
        {
            "id": doc.id,
            "name": doc.original_name,
            "owner": username,
            "type": doc.file_type,
            "size": doc.file_size,
            "processed": doc.is_processed,
            "chunks": doc.chunk_count,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        }
        for doc, username in rows
    ]


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user account."""
    from sqlalchemy import select as sa_select

    result = await db.execute(sa_select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = not user.is_active
    await db.commit()

    return {"user_id": user_id, "is_active": user.is_active}
