"""Image validation and re-encoding.

Every upload is opened with Pillow, checked, auto-rotated, resized and re-saved as a JPEG.
This rejects files that only pretend to be images and strips EXIF metadata such as GPS location.
"""
import io

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 60_000_000
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_SIDE = 2400


class ImageError(ValueError):
    pass


def process_image(raw: bytes) -> tuple[bytes, int, int]:
    try:
        probe = Image.open(io.BytesIO(raw))
        probe.verify()
        img = Image.open(io.BytesIO(raw))
        fmt = img.format
    except Exception as exc:  # noqa: BLE001 - any decoder failure means "not a usable image"
        raise ImageError("That file isn't a valid image.") from exc
    if fmt not in ALLOWED_FORMATS:
        raise ImageError("Only JPG, PNG and WebP photos are supported.")
    try:
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "LA", "P"):
            rgba = img.convert("RGBA")
            flat = Image.new("RGB", rgba.size, (255, 255, 255))
            flat.paste(rgba, mask=rgba.split()[-1])
            img = flat
        else:
            img = img.convert("RGB")
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, "JPEG", quality=85, optimize=True, progressive=True)
    except Exception as exc:  # noqa: BLE001
        raise ImageError("We couldn't read that image. Try exporting it as a JPG.") from exc
    return out.getvalue(), img.width, img.height
