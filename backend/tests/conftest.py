import io
import os
import tempfile

# Configure the app for tests BEFORE it is imported.
os.environ.update(
    USE_MOCK_DB="true",
    SEED_DEMO_ON_START="false",
    STORAGE_BACKEND="local",
    UPLOAD_DIR=tempfile.mkdtemp(prefix="uaf-test-uploads-"),
    ADMIN_API_KEY="test-admin-key",
    SECRET_SALT="test-salt-test-salt-test-salt",
    BLOCKED_WORDS="forbiddenword",
    REPORT_HIDE_THRESHOLD="2",
    RATE_POST_LIMIT="1000",
    RATE_COMMENT_LIMIT="1000",
    RATE_LIKE_LIMIT="1000",
    RATE_REPORT_LIMIT="1000",
    RATE_READ_LIMIT="100000",
)

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.security import limiter


@pytest.fixture()
def client():
    limiter.reset()
    with TestClient(app) as c:
        yield c


def make_image(size=(640, 480), fmt="JPEG", color=(60, 120, 90)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, fmt)
    return buf.getvalue()


@pytest.fixture()
def jpeg():
    return make_image()


def post_memory(client, jpeg, **fields):
    data = {"description": "Chai after the lab exam", "category": "Campus Life", **fields}
    files = [("images", ("a.jpg", jpeg, "image/jpeg"))]
    return client.post("/api/memories", data=data, files=files, headers={"x-client-id": "tester-1"})
