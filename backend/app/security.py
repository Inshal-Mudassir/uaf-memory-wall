"""Input sanitising, spam checks, visitor fingerprints, rate limiting and admin auth."""
import hashlib
import hmac
import re
import threading
import time
import unicodedata
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request

from .config import settings

# ---------------------------------------------------------------- sanitising
_TAG_RE = re.compile(r"<[^>]*>")
# control characters, zero-width and bidi override characters (not newline or tab)
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")
_URL_RE = re.compile(r"(https?://|www\.)", re.I)
_REPEAT_RE = re.compile(r"(.)\1{19,}")


def clean_text(value: str | None, max_len: int, multiline: bool = False) -> str:
    """Return plain text: no HTML tags, control characters or runaway whitespace."""
    text = unicodedata.normalize("NFC", value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = _TAG_RE.sub("", text)
    text = _CTRL_RE.sub("", text)
    if multiline:
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
    else:
        text = re.sub(r"\s+", " ", text)
    return text.strip()[:max_len]


def check_spam(*texts: str) -> None:
    joined = "\n".join(t for t in texts if t)
    lowered = joined.lower()
    if len(_URL_RE.findall(joined)) > 2:
        raise HTTPException(422, "Please keep links out of memories and comments.")
    if _REPEAT_RE.search(joined):
        raise HTTPException(422, "That looks like spam. Please write it in your own words.")
    for word in settings.blocked_list:
        if word and word in lowered:
            raise HTTPException(422, "That text contains words that aren't allowed on the wall.")


# ---------------------------------------------------------------- visitors
def client_ip(request: Request) -> str:
    if settings.trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def voter_id(request: Request) -> str:
    """A salted hash of IP and browser id. Used only to stop duplicate likes and reports.

    The raw IP address and browser id are never stored.
    """
    cid = request.headers.get("x-client-id", "")[:64]
    raw = f"{settings.secret_salt}:{client_ip(request)}:{cid}"
    return hashlib.sha256(raw.encode()).hexdigest()


# ---------------------------------------------------------------- rate limiting
class RateLimiter:
    """Sliding-window limiter held in memory.

    Good for a single server instance. For several instances, swap in Redis.
    """

    def __init__(self) -> None:
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_sweep = time.monotonic()

    def check(self, key: str, limit: int, window: int) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                retry = max(1, int(window - (now - q[0])))
                raise HTTPException(
                    429,
                    f"You're going a little fast. Please try again in {_human(retry)}.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            if now - self._last_sweep > 300:
                self._sweep(now)

    def _sweep(self, now: float) -> None:
        for k in [k for k, q in self._hits.items() if not q or now - q[-1] > 3600]:
            del self._hits[k]
        self._last_sweep = now

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def _human(seconds: int) -> str:
    if seconds < 90:
        return f"{seconds} seconds"
    return f"{round(seconds / 60)} minutes"


limiter = RateLimiter()


def _dep(name: str, limit_attr: str, window_attr: str):
    def dependency(request: Request) -> None:
        limiter.check(f"{name}:{client_ip(request)}", getattr(settings, limit_attr), getattr(settings, window_attr))

    return dependency


limit_read = _dep("read", "rate_read_limit", "rate_read_window")
limit_post = _dep("post", "rate_post_limit", "rate_post_window")
limit_comment = _dep("comment", "rate_comment_limit", "rate_comment_window")
limit_like = _dep("like", "rate_like_limit", "rate_like_window")
limit_report = _dep("report", "rate_report_limit", "rate_report_window")


# Remember what a visitor just posted so identical comments can't be spammed.
_recent: dict[str, float] = {}
_recent_lock = threading.Lock()


def reject_duplicate(voter: str, text: str, ttl: int = 120) -> None:
    key = hashlib.sha256(f"{voter}:{text.lower()}".encode()).hexdigest()
    now = time.monotonic()
    with _recent_lock:
        for k in [k for k, t in _recent.items() if now - t > ttl]:
            del _recent[k]
        if key in _recent:
            raise HTTPException(429, "You've already posted that. Try adding something new.")
        _recent[key] = now


# ---------------------------------------------------------------- admin auth
def require_admin(request: Request, x_admin_key: str | None = Header(default=None)) -> None:
    if not settings.admin_api_key:
        raise HTTPException(503, "Moderation is not configured. Set ADMIN_API_KEY on the server.")
    # Every attempt counts, which makes guessing the key impractical.
    limiter.check(f"admin:{client_ip(request)}", settings.rate_admin_limit, settings.rate_admin_window)
    supplied = hashlib.sha256((x_admin_key or "").encode()).digest()
    expected = hashlib.sha256(settings.admin_api_key.encode()).digest()
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(401, "Invalid moderation key.")
