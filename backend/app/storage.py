"""Image storage. Cloudinary in production, a local folder for development."""
import io
import logging
import os
import uuid
from pathlib import Path

from .config import settings

log = logging.getLogger("uaf.storage")
_configured = False


def _configure_cloudinary() -> None:
    global _configured
    if _configured:
        return
    import cloudinary

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    _configured = True


def upload_image(data: bytes) -> dict:
    """Store image bytes. Returns {url, publicId, width, height, bytes}. Blocking: run in a thread."""
    if settings.storage_backend == "local":
        folder = Path(settings.upload_dir)
        folder.mkdir(parents=True, exist_ok=True)
        name = f"{uuid.uuid4().hex}.jpg"
        (folder / name).write_bytes(data)
        return {"url": f"{settings.public_base_url.rstrip('/')}/media/{name}", "publicId": f"local:{name}", "bytes": len(data)}

    _configure_cloudinary()
    import cloudinary.uploader

    res = cloudinary.uploader.upload(
        io.BytesIO(data),
        folder=settings.cloudinary_folder,
        resource_type="image",
        unique_filename=True,
        overwrite=False,
        tags=["uaf-memory-wall"],
    )
    return {
        "url": res["secure_url"],
        "publicId": res["public_id"],
        "width": res.get("width"),
        "height": res.get("height"),
        "bytes": res.get("bytes"),
    }


def delete_images(public_ids: list[str]) -> None:
    """Best-effort removal. Blocking: run in a thread."""
    ids = [p for p in public_ids if p]
    if not ids:
        return
    try:
        local = [p for p in ids if p.startswith("local:")]
        for p in local:
            try:
                os.remove(Path(settings.upload_dir) / p.split(":", 1)[1])
            except FileNotFoundError:
                pass
        remote = [p for p in ids if not p.startswith("local:")]
        if remote:
            _configure_cloudinary()
            import cloudinary.api

            cloudinary.api.delete_resources(remote, resource_type="image", invalidate=True)
    except Exception:  # noqa: BLE001
        log.exception("Could not delete images %s", ids)


def transform_url(url: str, transformation: str) -> str:
    """Insert a Cloudinary delivery transformation (resize, auto format) into an image URL."""
    marker = "/upload/"
    if "res.cloudinary.com" in url and marker in url:
        return url.replace(marker, f"/upload/{transformation}/", 1)
    return url
