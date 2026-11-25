"""Turn MongoDB documents into the JSON the frontend receives."""
from .constants import ANONYMOUS_LABEL
from .storage import transform_url


def _iso(dt) -> str:
    return dt.isoformat().replace("+00:00", "Z") if dt.tzinfo else dt.isoformat() + "Z"


def image_out(img: dict) -> dict:
    return {
        "url": transform_url(img["url"], "f_auto,q_auto,w_1800,c_limit"),
        "thumb": transform_url(img["url"], "f_auto,q_auto,w_720,c_limit"),
        "width": img.get("width"),
        "height": img.get("height"),
    }


def memory_out(doc: dict, liked: bool = False, admin: bool = False) -> dict:
    anonymous = bool(doc.get("isAnonymous")) or not doc.get("authorName")
    out = {
        "id": str(doc["_id"]),
        "title": doc.get("title", ""),
        "description": doc.get("description", ""),
        "images": [image_out(i) for i in doc.get("images", [])],
        "author": ANONYMOUS_LABEL if anonymous else doc["authorName"],
        "isAnonymous": anonymous,
        "category": doc.get("category"),
        "likes": doc.get("likes", 0),
        "commentCount": doc.get("commentCount", 0),
        "likedByMe": liked,
        "isDemo": bool(doc.get("isDemo")),
        "createdAt": _iso(doc["createdAt"]),
    }
    if admin:
        out["isHidden"] = bool(doc.get("isHidden"))
        out["reportCount"] = doc.get("reportCount", 0)
    return out


def comment_out(doc: dict, admin: bool = False) -> dict:
    anonymous = bool(doc.get("isAnonymous")) or not doc.get("authorName")
    out = {
        "id": str(doc["_id"]),
        "memoryId": str(doc["memoryId"]),
        "text": doc["text"],
        "author": ANONYMOUS_LABEL if anonymous else doc["authorName"],
        "isAnonymous": anonymous,
        "isDemo": bool(doc.get("isDemo")),
        "createdAt": _iso(doc["createdAt"]),
    }
    if admin:
        out["isHidden"] = bool(doc.get("isHidden"))
        out["reportCount"] = doc.get("reportCount", 0)
    return out
