"""MongoDB connection (Motor) and index management."""
import logging

from .config import settings

log = logging.getLogger("uaf.db")

_client = None
_db = None


async def connect() -> None:
    global _client, _db
    if settings.use_mock_db:
        from mongomock_motor import AsyncMongoMockClient

        log.warning("Using the in-memory mock database. Data is lost on restart.")
        _client = AsyncMongoMockClient()
    else:
        from motor.motor_asyncio import AsyncIOMotorClient

        _client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000, appname="uaf-memory-wall")
        await _client.admin.command("ping")
    _db = _client[settings.mongodb_db]
    await ensure_indexes()


async def disconnect() -> None:
    global _client, _db
    if _client is not None and not settings.use_mock_db:
        _client.close()
    _client = None
    _db = None


def get_db():
    if _db is None:
        raise RuntimeError("Database is not connected")
    return _db


async def ensure_indexes() -> None:
    db = get_db()
    await db.memories.create_index([("isHidden", 1), ("createdAt", -1)])
    await db.memories.create_index([("category", 1), ("isHidden", 1), ("createdAt", -1)])
    await db.memories.create_index([("isHidden", 1), ("likes", -1), ("createdAt", -1)])
    await db.memories.create_index([("reportCount", -1)])
    await db.memories.create_index([("isDemo", 1)])
    await db.comments.create_index([("memoryId", 1), ("createdAt", 1)])
    await db.comments.create_index([("reportCount", -1)])
    # One like per visitor per memory, enforced by the database.
    await db.likes.create_index([("memoryId", 1), ("voter", 1)], unique=True)
    # One report per visitor per item, so nobody can hide a post alone.
    await db.reports.create_index([("targetType", 1), ("targetId", 1), ("voter", 1)], unique=True)
