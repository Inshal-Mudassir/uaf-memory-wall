"""Moderation endpoints. Every route requires the X-Admin-Key header."""
import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

from ..db import get_db
from ..schemas import ModerationPatch
from ..security import require_admin
from ..serializers import comment_out, memory_out
from ..storage import delete_images
from .common import parse_oid

router = APIRouter(prefix="/admin", tags=["Moderation"], dependencies=[Depends(require_admin)])

Filter = Literal["reported", "hidden", "all"]


def _filter(kind: Filter) -> dict:
    if kind == "reported":
        return {"$or": [{"reportCount": {"$gt": 0}}, {"isHidden": True}]}
    if kind == "hidden":
        return {"isHidden": True}
    return {}


@router.get("/check", summary="Verify the moderation key")
async def check():
    return {"ok": True}


@router.get("/memories", summary="List memories for review")
async def admin_memories(filter: Filter = "reported", page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=50)):
    db = get_db()
    flt = _filter(filter)
    total = await db.memories.count_documents(flt)
    docs = await db.memories.find(flt).sort([("reportCount", -1), ("createdAt", -1)]).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [memory_out(d, admin=True) for d in docs], "total": total, "hasMore": page * limit < total}


@router.get("/comments", summary="List comments for review")
async def admin_comments(filter: Filter = "reported", page: int = Query(1, ge=1), limit: int = Query(30, ge=1, le=50)):
    db = get_db()
    flt = _filter(filter)
    total = await db.comments.count_documents(flt)
    docs = await db.comments.find(flt).sort([("reportCount", -1), ("createdAt", -1)]).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [comment_out(d, admin=True) for d in docs], "total": total, "hasMore": page * limit < total}


@router.patch("/memories/{memory_id}", summary="Hide, restore, or clear reports on a memory")
async def patch_memory(memory_id: str, body: ModerationPatch):
    db = get_db()
    oid = parse_oid(memory_id)
    updates: dict = {}
    if body.isHidden is not None:
        updates["isHidden"] = body.isHidden
    if body.dismissReports:
        updates.update({"reportCount": 0, "autoHidden": False})
        await db.reports.delete_many({"targetType": "memory", "targetId": oid})
    if not updates:
        raise HTTPException(422, "Nothing to update.")
    res = await db.memories.update_one({"_id": oid}, {"$set": updates})
    if not res.matched_count:
        raise HTTPException(404, "Memory not found.")
    return memory_out(await db.memories.find_one({"_id": oid}), admin=True)


@router.patch("/comments/{comment_id}", summary="Hide, restore, or clear reports on a comment")
async def patch_comment(comment_id: str, body: ModerationPatch):
    db = get_db()
    oid = parse_oid(comment_id)
    updates: dict = {}
    if body.isHidden is not None:
        updates["isHidden"] = body.isHidden
    if body.dismissReports:
        updates.update({"reportCount": 0, "autoHidden": False})
        await db.reports.delete_many({"targetType": "comment", "targetId": oid})
    if not updates:
        raise HTTPException(422, "Nothing to update.")
    before = await db.comments.find_one({"_id": oid})
    if not before:
        raise HTTPException(404, "Comment not found.")
    await db.comments.update_one({"_id": oid}, {"$set": updates})
    hidden_before, hidden_after = bool(before.get("isHidden")), updates.get("isHidden", bool(before.get("isHidden")))
    if hidden_before != hidden_after:  # keep the visible comment count honest
        await db.memories.update_one({"_id": before["memoryId"]}, {"$inc": {"commentCount": -1 if hidden_after else 1}})
    return comment_out(await db.comments.find_one({"_id": oid}), admin=True)


@router.delete("/memories/{memory_id}", summary="Permanently delete a memory, its photos and comments")
async def delete_memory(memory_id: str):
    db = get_db()
    oid = parse_oid(memory_id)
    doc = await db.memories.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Memory not found.")
    await asyncio.gather(
        db.comments.delete_many({"memoryId": oid}),
        db.likes.delete_many({"memoryId": oid}),
        db.reports.delete_many({"targetType": "memory", "targetId": oid}),
    )
    await db.memories.delete_one({"_id": oid})
    await run_in_threadpool(delete_images, [i.get("publicId") for i in doc.get("images", [])])
    return {"ok": True}


@router.delete("/comments/{comment_id}", summary="Permanently delete a comment")
async def delete_comment(comment_id: str):
    db = get_db()
    oid = parse_oid(comment_id)
    doc = await db.comments.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Comment not found.")
    await db.comments.delete_one({"_id": oid})
    await db.reports.delete_many({"targetType": "comment", "targetId": oid})
    if not doc.get("isHidden"):
        await db.memories.update_one({"_id": doc["memoryId"], "commentCount": {"$gt": 0}}, {"$inc": {"commentCount": -1}})
    return {"ok": True}
