import asyncio
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..constants import CATEGORIES
from ..db import get_db
from ..images import ALLOWED_MIME, ImageError, process_image
from ..schemas import CommentIn, LikeIn, ReportIn, SortOption
from ..security import (
    check_spam,
    clean_text,
    limit_comment,
    limit_like,
    limit_post,
    limit_read,
    limit_report,
    reject_duplicate,
    voter_id,
)
from ..serializers import comment_out, memory_out
from ..storage import delete_images, upload_image
from .common import parse_oid

router = APIRouter(prefix="/memories", tags=["Memories"])

VISIBLE = {"isHidden": {"$ne": True}}
SORTS = {
    "newest": [("createdAt", -1), ("_id", -1)],
    "oldest": [("createdAt", 1), ("_id", 1)],
    "popular": [("likes", -1), ("commentCount", -1), ("createdAt", -1)],
}


async def _liked_ids(db, ids: list, voter: str) -> set:
    if not ids:
        return set()
    rows = await db.likes.find({"memoryId": {"$in": ids}, "voter": voter}, {"memoryId": 1}).to_list(None)
    return {r["memoryId"] for r in rows}


# ------------------------------------------------------------------ list
@router.get("", dependencies=[Depends(limit_read)], summary="List and search memories")
async def list_memories(
    request: Request,
    q: str | None = Query(None, max_length=80, description="Search words"),
    category: str | None = Query(None, description="One of the category names"),
    sort: SortOption = "newest",
    page: int = Query(1, ge=1, le=500),
    limit: int = Query(12, ge=1, le=30),
):
    db = get_db()
    flt: dict = dict(VISIBLE)
    if category:
        if category not in CATEGORIES:
            raise HTTPException(422, "Unknown category.")
        flt["category"] = category
    words = [w for w in re.split(r"\s+", clean_text(q, 80)) if w][:5]
    if words:
        flt["$and"] = [
            {"$or": [{f: {"$regex": re.escape(w), "$options": "i"}} for f in ("title", "description", "authorName")]}
            for w in words
        ]
    total = await db.memories.count_documents(flt)
    docs = await db.memories.find(flt).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).to_list(limit)
    liked = await _liked_ids(db, [d["_id"] for d in docs], voter_id(request))
    return {
        "items": [memory_out(d, d["_id"] in liked) for d in docs],
        "page": page,
        "limit": limit,
        "total": total,
        "hasMore": page * limit < total,
    }


@router.get("/featured", dependencies=[Depends(limit_read)], summary="Popular and memorable moments")
async def featured(request: Request, limit: int = Query(5, ge=1, le=10)):
    db = get_db()
    pool = await db.memories.find(VISIBLE).sort([("likes", -1), ("createdAt", -1)]).limit(40).to_list(40)
    pool.sort(key=lambda d: (d.get("likes", 0) + d.get("commentCount", 0), d["createdAt"]), reverse=True)
    docs = pool[:limit]
    liked = await _liked_ids(db, [d["_id"] for d in docs], voter_id(request))
    return {"items": [memory_out(d, d["_id"] in liked) for d in docs]}


@router.get("/categories", dependencies=[Depends(limit_read)], summary="Categories with memory counts")
async def categories():
    db = get_db()
    rows = await db.memories.aggregate(
        [{"$match": VISIBLE}, {"$group": {"_id": "$category", "count": {"$sum": 1}}}]
    ).to_list(None)
    counts = {r["_id"]: r["count"] for r in rows}
    return {
        "total": sum(counts.values()),
        "items": [{"name": c, "count": counts.get(c, 0)} for c in CATEGORIES],
    }


@router.get("/{memory_id}", dependencies=[Depends(limit_read)], summary="Get one memory")
async def get_memory(memory_id: str, request: Request):
    db = get_db()
    oid = parse_oid(memory_id)
    doc = await db.memories.find_one({"_id": oid, **VISIBLE})
    if not doc:
        raise HTTPException(404, "This memory isn't on the wall any more.")
    liked = await _liked_ids(db, [oid], voter_id(request))
    return memory_out(doc, oid in liked)


# ------------------------------------------------------------------ create
@router.post("", status_code=201, dependencies=[Depends(limit_post)], summary="Share a memory (multipart form)")
async def create_memory(
    request: Request,
    description: str = Form(...),
    category: str = Form(...),
    title: str = Form(""),
    authorName: str = Form(""),
    isAnonymous: bool = Form(False),
    website: str = Form(""),  # honeypot
    images: list[UploadFile] = File(...),
):
    if website:
        raise HTTPException(400, "We couldn't post that.")
    max_bytes = settings.max_image_mb * 1024 * 1024
    declared = int(request.headers.get("content-length") or 0)
    if declared > max_bytes * settings.max_images + 1024 * 1024:
        raise HTTPException(413, f"That's too much to upload at once. Keep each photo under {settings.max_image_mb} MB.")

    title = clean_text(title, 100)
    description = clean_text(description, 2000, multiline=True)
    name = clean_text(authorName, 60)
    if len(description) < 3:
        raise HTTPException(422, "Add a few words describing your memory.")
    if category not in CATEGORIES:
        raise HTTPException(422, "Choose a category for your memory.")
    check_spam(title, description, name)
    if not 1 <= len(images) <= settings.max_images:
        raise HTTPException(422, f"Add between 1 and {settings.max_images} photos.")

    raws: list[bytes] = []
    for f in images:
        if f.content_type not in ALLOWED_MIME:
            raise HTTPException(422, f"“{f.filename}” isn't a JPG, PNG or WebP image.")
        data = await f.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise HTTPException(413, f"“{f.filename}” is over {settings.max_image_mb} MB.")
        if not data:
            raise HTTPException(422, f"“{f.filename}” is empty.")
        raws.append(data)

    try:
        processed = [await run_in_threadpool(process_image, r) for r in raws]
    except ImageError as exc:
        raise HTTPException(422, str(exc)) from exc

    async def store(item):
        data, w, h = item
        meta = await run_in_threadpool(upload_image, data)
        meta["width"] = meta.get("width") or w
        meta["height"] = meta.get("height") or h
        return meta

    results = await asyncio.gather(*(store(p) for p in processed), return_exceptions=True)
    stored = [r for r in results if not isinstance(r, Exception)]
    if len(stored) != len(results):
        await run_in_threadpool(delete_images, [s["publicId"] for s in stored])
        raise HTTPException(502, "We couldn't save your photos right now. Please try again in a moment.")

    anonymous = bool(isAnonymous) or not name
    doc = {
        "title": title,
        "description": description,
        "images": stored,
        "authorName": "" if anonymous else name,
        "isAnonymous": anonymous,
        "category": category,
        "likes": 0,
        "commentCount": 0,
        "reportCount": 0,
        "isHidden": False,
        "isDemo": False,
        "createdAt": datetime.now(timezone.utc),
    }
    res = await get_db().memories.insert_one(doc)
    doc["_id"] = res.inserted_id
    return memory_out(doc)


# ------------------------------------------------------------------ likes
@router.put("/{memory_id}/like", dependencies=[Depends(limit_like)], summary="Like or unlike a memory")
async def set_like(memory_id: str, body: LikeIn, request: Request):
    db = get_db()
    oid = parse_oid(memory_id)
    if not await db.memories.find_one({"_id": oid, **VISIBLE}, {"_id": 1}):
        raise HTTPException(404, "This memory isn't on the wall any more.")
    voter = voter_id(request)
    if body.liked:
        try:
            await db.likes.insert_one({"memoryId": oid, "voter": voter, "createdAt": datetime.now(timezone.utc)})
            await db.memories.update_one({"_id": oid}, {"$inc": {"likes": 1}})
        except DuplicateKeyError:
            pass  # already liked: the request is idempotent
    else:
        res = await db.likes.delete_one({"memoryId": oid, "voter": voter})
        if res.deleted_count:
            await db.memories.update_one({"_id": oid, "likes": {"$gt": 0}}, {"$inc": {"likes": -1}})
    doc = await db.memories.find_one({"_id": oid}, {"likes": 1})
    return {"likes": doc.get("likes", 0), "liked": body.liked}


# ------------------------------------------------------------------ comments
@router.get("/{memory_id}/comments", dependencies=[Depends(limit_read)], summary="List comments on a memory")
async def list_comments(memory_id: str, page: int = Query(1, ge=1, le=200), limit: int = Query(30, ge=1, le=50)):
    db = get_db()
    oid = parse_oid(memory_id)
    flt = {"memoryId": oid, **VISIBLE}
    total = await db.comments.count_documents(flt)
    docs = await db.comments.find(flt).sort([("createdAt", 1), ("_id", 1)]).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": [comment_out(d) for d in docs], "page": page, "total": total, "hasMore": page * limit < total}


@router.post("/{memory_id}/comments", status_code=201, dependencies=[Depends(limit_comment)], summary="Add a comment")
async def add_comment(memory_id: str, body: CommentIn, request: Request):
    if body.website:
        raise HTTPException(400, "We couldn't post that.")
    db = get_db()
    oid = parse_oid(memory_id)
    if not await db.memories.find_one({"_id": oid, **VISIBLE}, {"_id": 1}):
        raise HTTPException(404, "This memory isn't on the wall any more.")
    text = clean_text(body.text, 800, multiline=True)
    name = clean_text(body.authorName, 60)
    if not text:
        raise HTTPException(422, "Write a comment first.")
    check_spam(text, name)
    reject_duplicate(voter_id(request), text)
    anonymous = body.isAnonymous or not name
    doc = {
        "memoryId": oid,
        "text": text,
        "authorName": "" if anonymous else name,
        "isAnonymous": anonymous,
        "reportCount": 0,
        "isHidden": False,
        "createdAt": datetime.now(timezone.utc),
    }
    res = await db.comments.insert_one(doc)
    doc["_id"] = res.inserted_id
    await db.memories.update_one({"_id": oid}, {"$inc": {"commentCount": 1}})
    return comment_out(doc)


# ------------------------------------------------------------------ reports
@router.post("/{memory_id}/report", dependencies=[Depends(limit_report)], summary="Report a memory to moderators")
async def report_memory(memory_id: str, body: ReportIn, request: Request):
    db = get_db()
    oid = parse_oid(memory_id)
    if not await db.memories.find_one({"_id": oid}, {"_id": 1}):
        raise HTTPException(404, "We couldn't find that memory.")
    return await _record_report(db, db.memories, "memory", oid, body.reason, voter_id(request))


async def _record_report(db, collection, target_type: str, oid, reason: str, voter: str) -> dict:
    try:
        await db.reports.insert_one(
            {
                "targetType": target_type,
                "targetId": oid,
                "voter": voter,
                "reason": clean_text(reason, 200),
                "createdAt": datetime.now(timezone.utc),
            }
        )
    except DuplicateKeyError:
        return {"ok": True, "message": "You've already reported this. Moderators will take a look."}
    await collection.update_one({"_id": oid}, {"$inc": {"reportCount": 1}})
    doc = await collection.find_one({"_id": oid}, {"reportCount": 1})
    if doc.get("reportCount", 0) >= settings.report_hide_threshold:
        await collection.update_one({"_id": oid}, {"$set": {"isHidden": True, "autoHidden": True}})
    return {"ok": True, "message": "Thanks for letting us know. Moderators will review it."}
