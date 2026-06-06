"""File handling utilities — validation, saving, cleanup."""

import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from config import settings


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


def validate_file(file: UploadFile) -> None:
    """Raise HTTPException if the file type or size is invalid."""
    ext = get_file_extension(file.filename)
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )


def generate_unique_filename(original_name: str) -> str:
    """Generate a unique filename to avoid collisions."""
    ext = get_file_extension(original_name)
    return f"{uuid.uuid4().hex}{ext}"


async def save_upload_file(file: UploadFile, user_id: int) -> tuple[str, int]:
    """
    Save an uploaded file to disk.
    Returns (saved_filename, file_size_bytes).
    """
    user_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    unique_name = generate_unique_filename(file.filename)
    file_path = os.path.join(user_dir, unique_name)

    content = await file.read()
    file_size = len(content)

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB",
        )

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    return unique_name, file_size


def get_file_path(user_id: int, filename: str) -> str:
    return os.path.join(settings.UPLOAD_DIR, str(user_id), filename)


def delete_file(user_id: int, filename: str) -> bool:
    """Delete a file from disk. Returns True if deleted."""
    path = get_file_path(user_id, filename)
    if os.path.exists(path):
        os.remove(path)
        return True
    return False


def format_file_size(size_bytes: int) -> str:
    """Human-readable file size."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
