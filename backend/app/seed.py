"""Add (or remove) clearly-labelled demo memories for development previews.

    python -m app.seed            # add demo memories
    python -m app.seed --purge    # remove all demo memories, comments and their images

Demo records carry isDemo=true, so the interface shows a "Demo" stamp on them.
"""
import argparse
import asyncio
import io
from datetime import datetime, timedelta, timezone

from fastapi.concurrency import run_in_threadpool

from . import db
from .config import settings
from .demo_art import render
from .storage import delete_images, upload_image

DEMO = [
    ("campus_sunset", "Campus Life", "Golden hour at the main building", "The walk back to the hostel was always better at sunset. The whole campus turned orange for ten minutes.", "Ayesha", 21, 5, [
        ("Anonymous", "That clock tower never once showed the right time and we loved it anyway."),
        ("Hamza", "Can we go back to this exact evening?"),
    ]),
    ("friends_bench", "Friends & Memories", "Four of us, one bench", "Nobody ever remembers what we talked about. Everybody remembers the laughing.", None, 18, 9, [
        ("Anonymous", "The bench by the library, right? Best seat in the university."),
    ]),
    ("lecture_hall", "Classrooms & Lectures", "The last lecture before the mid-terms", "Half of us were copying the board, the other half were praying the sir would skip the proof.", "Bilal", 15, 3, []),
    ("farewell_gate", "Farewell Moments", "Walking out under the arch", "We took this one on the last day. Nobody said it, but everyone knew we would not all be in the same place again.", None, 12, 14, [
        ("Maryam", "I still have this picture as my wallpaper."),
        ("Anonymous", "I wasn't ready to leave and I'm still not."),
    ]),
    ("festival", "University Festivals", "Spring festival stalls", "Food stalls, bunting and a very loud speaker. Somebody sold out of samosas in under an hour.", "Zainab", 10, 7, [
        ("Anonymous", "The samosa stall, always."),
    ]),
    ("chai_break", "Funny Moments", "The chai that cost us a class", "We went for one cup and came back after the attendance was marked. Worth it.", None, 9, 11, [
        ("Hamza", "We said five minutes. It was fifty."),
        ("Anonymous", "Rest in peace, attendance."),
    ]),
    ("trip_mountains", "Trips & Adventures", "The department trip to the north", "A cold night, a tent that took four people forty minutes to put up, and more stars than anyone had seen before.", "Usman", 7, 8, []),
    ("graduation", "Graduation", "Caps in the air", "Four years, one photo. It took six attempts to get every cap in the frame.", None, 5, 16, [
        ("Anonymous", "Class of the group chat that never went quiet."),
    ]),
    ("library", "Campus Life", "Finals week in the library", "Every table taken by nine in the morning, and somehow someone always had snacks.", "Hira", 3, 4, []),
    ("rain_campus", "Random Memories", "First rain of the semester", "Nobody had an umbrella. Everybody walked slowly on purpose.", None, 2, 6, [
        ("Anonymous", "The smell of wet earth outside the department. Nothing else compares."),
    ]),
    ("exam_morning", "Classrooms & Lectures", "Exam morning supplies", "Pens, a good-luck charm, notes nobody had finished reading, and a clock that moved far too quickly.", "Sara", 1, 2, []),
]


async def add_demo() -> None:
    d = db.get_db()
    if await d.memories.count_documents({"isDemo": True}):
        print("Demo memories already exist. Run with --purge first to recreate them.")
        return
    now = datetime.now(timezone.utc)
    for scene, category, title, text, author, days_ago, likes, comments in DEMO:
        buf = io.BytesIO()
        img = render(scene)
        img.save(buf, "JPEG", quality=84, optimize=True)
        meta = await run_in_threadpool(upload_image, buf.getvalue())
        meta["width"], meta["height"] = meta.get("width") or img.width, meta.get("height") or img.height
        created = now - timedelta(days=days_ago, hours=days_ago % 5)
        res = await d.memories.insert_one({
            "title": title, "description": text, "images": [meta],
            "authorName": author or "", "isAnonymous": author is None, "category": category,
            "likes": 0, "commentCount": len(comments), "reportCount": 0, "isHidden": False,
            "isDemo": True, "createdAt": created,
        })
        for i, (name, body) in enumerate(comments):
            await d.comments.insert_one({
                "memoryId": res.inserted_id, "text": body, "authorName": "" if name == "Anonymous" else name,
                "isAnonymous": name == "Anonymous", "reportCount": 0, "isHidden": False, "isDemo": True,
                "createdAt": created + timedelta(hours=3 + i * 5),
            })
        print("added:", title)
    print(f"Done. {len(DEMO)} demo memories added (they start with zero likes, so no numbers are invented).")


async def purge_demo() -> None:
    d = db.get_db()
    docs = await d.memories.find({"isDemo": True}).to_list(None)
    ids = [x["_id"] for x in docs]
    for doc in docs:
        await run_in_threadpool(delete_images, [i.get("publicId") for i in doc.get("images", [])])
    await d.comments.delete_many({"memoryId": {"$in": ids}})
    await d.likes.delete_many({"memoryId": {"$in": ids}})
    await d.memories.delete_many({"_id": {"$in": ids}})
    print(f"Removed {len(ids)} demo memories.")


async def main(purge: bool) -> None:
    settings.validate_for_runtime()
    await db.connect()
    try:
        await (purge_demo() if purge else add_demo())
    finally:
        await db.disconnect()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--purge", action="store_true", help="remove demo content instead of adding it")
    asyncio.run(main(ap.parse_args().purge))
