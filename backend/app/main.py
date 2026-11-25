import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import db
from .config import settings
from .constants import CATEGORIES
from .routers import admin, comments, memories

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

DESCRIPTION = """
Backend for **UAF Memory Wall**, a no-login digital wall for university photographs and stories.

* Visitors can browse, search, like and comment without an account.
* Likes and reports are de-duplicated with a salted hash of IP and browser id. Raw IPs are not stored.
* Moderation routes under `/api/admin` need the `X-Admin-Key` header.
"""


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_for_runtime()
    await db.connect()
    if settings.use_mock_db and settings.seed_demo_on_start:
        from .seed import add_demo

        await add_demo()
    yield
    await db.disconnect()


app = FastAPI(title="UAF Memory Wall API", version="1.0.0", description=DESCRIPTION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Client-Id", "X-Admin-Key"],
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    err = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in err.get("loc", []) if p not in ("body", "query", "path", "form"))
    msg = err.get("msg", "Invalid input").removeprefix("Value error, ")
    return JSONResponse(status_code=422, content={"detail": f"{field}: {msg}" if field else msg})


app.include_router(memories.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

if settings.storage_backend == "local":  # development only
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.upload_dir), name="media")


@app.get("/api/health", tags=["Meta"], summary="Health check")
async def health():
    return {"status": "ok"}


@app.get("/api/config", tags=["Meta"], summary="Public limits and categories")
async def public_config():
    return {
        "categories": CATEGORIES,
        "maxImages": settings.max_images,
        "maxImageMb": settings.max_image_mb,
        "allowedTypes": ["image/jpeg", "image/png", "image/webp"],
    }


@app.get("/", include_in_schema=False)
async def root():
    return {"name": "UAF Memory Wall API", "docs": "/docs"}
