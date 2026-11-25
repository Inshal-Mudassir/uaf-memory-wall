import io

from tests.conftest import make_image, post_memory

ADMIN = {"x-admin-key": "test-admin-key"}


def test_create_named_and_anonymous(client, jpeg):
    r = post_memory(client, jpeg, title="Lab exam", authorName="Hira", isAnonymous="false")
    assert r.status_code == 201, r.text
    m = r.json()
    assert m["author"] == "Hira" and not m["isAnonymous"]
    assert m["images"][0]["width"] and m["likes"] == 0

    r = post_memory(client, jpeg, authorName="Hira", isAnonymous="true")
    assert r.json()["author"] == "Anonymous"
    r = post_memory(client, jpeg)  # no name at all
    assert r.json()["author"] == "Anonymous"


def test_anonymous_name_is_not_exposed(client, jpeg):
    post_memory(client, jpeg, authorName="Secret Name", isAnonymous="true")
    assert "Secret Name" not in client.get("/api/memories").text
    assert client.get("/api/memories", params={"q": "Secret"}).json()["total"] == 0


def test_validation(client, jpeg):
    assert post_memory(client, jpeg, category="Nope").status_code == 422
    assert post_memory(client, jpeg, description="  ").status_code == 422
    bad = client.post(
        "/api/memories",
        data={"description": "hello there", "category": "Campus Life"},
        files=[("images", ("x.jpg", b"not really an image", "image/jpeg"))],
    )
    assert bad.status_code == 422 and "valid image" in bad.json()["detail"]
    gif = client.post(
        "/api/memories",
        data={"description": "hello there", "category": "Campus Life"},
        files=[("images", ("x.gif", b"GIF89a", "image/gif"))],
    )
    assert gif.status_code == 422
    assert client.post("/api/memories", data={"description": "x y z", "category": "Campus Life"}).status_code == 422
    assert post_memory(client, jpeg, description="this has forbiddenword inside").status_code == 422
    assert post_memory(client, jpeg, website="http://spam.example").status_code == 400


def test_html_is_stripped(client, jpeg):
    m = post_memory(client, jpeg, title="<script>alert(1)</script>Hi", description="<b>Bold</b> memory <img src=x onerror=1>").json()
    assert "<" not in m["title"] and "<" not in m["description"]
    assert m["description"].startswith("Bold memory")


def test_exif_stripped_and_resized(client):
    big = make_image(size=(4000, 3000))
    m = post_memory(client, big).json()
    assert max(m["images"][0]["width"], m["images"][0]["height"]) <= 2400


def test_list_search_filter_sort(client, jpeg):
    post_memory(client, jpeg, description="Sunrise at the main gate", category="Campus Life", authorName="Zara")
    b = post_memory(client, jpeg, description="Farewell party", category="Farewell Moments").json()
    post_memory(client, jpeg, description="Trip to Murree", category="Trips & Adventures")
    client.put(f"/api/memories/{b['id']}/like", json={"liked": True}, headers={"x-client-id": "u1"})

    assert client.get("/api/memories").json()["total"] == 3
    assert client.get("/api/memories", params={"q": "murree"}).json()["total"] == 1
    assert client.get("/api/memories", params={"q": "zara"}).json()["total"] == 1
    assert client.get("/api/memories", params={"q": ".*"}).json()["total"] == 0  # regex is escaped
    assert client.get("/api/memories", params={"category": "Farewell Moments"}).json()["total"] == 1
    assert client.get("/api/memories", params={"category": "Bogus"}).status_code == 422
    assert client.get("/api/memories", params={"sort": "popular"}).json()["items"][0]["id"] == b["id"]
    newest = client.get("/api/memories", params={"sort": "newest"}).json()["items"]
    oldest = client.get("/api/memories", params={"sort": "oldest"}).json()["items"]
    assert newest[0]["id"] == oldest[-1]["id"]
    page = client.get("/api/memories", params={"limit": 2}).json()
    assert len(page["items"]) == 2 and page["hasMore"]
    assert not client.get("/api/memories", params={"limit": 2, "page": 2}).json()["hasMore"]


def test_like_is_idempotent_and_toggles(client, jpeg):
    mid = post_memory(client, jpeg).json()["id"]
    h = {"x-client-id": "visitor-a"}
    assert client.put(f"/api/memories/{mid}/like", json={"liked": True}, headers=h).json()["likes"] == 1
    assert client.put(f"/api/memories/{mid}/like", json={"liked": True}, headers=h).json()["likes"] == 1
    assert client.get(f"/api/memories/{mid}", headers=h).json()["likedByMe"] is True
    assert client.put(f"/api/memories/{mid}/like", json={"liked": True}, headers={"x-client-id": "visitor-b"}).json()["likes"] == 2
    assert client.put(f"/api/memories/{mid}/like", json={"liked": False}, headers=h).json()["likes"] == 1
    assert client.put(f"/api/memories/{mid}/like", json={"liked": False}, headers=h).json()["likes"] == 1
    assert client.get(f"/api/memories/{mid}", headers=h).json()["likedByMe"] is False


def test_comments(client, jpeg):
    mid = post_memory(client, jpeg).json()["id"]
    r = client.post(f"/api/memories/{mid}/comments", json={"text": "Good times", "authorName": "Ali"}, headers={"x-client-id": "c1"})
    assert r.status_code == 201 and r.json()["author"] == "Ali"
    r = client.post(f"/api/memories/{mid}/comments", json={"text": "Nice one", "authorName": "Ali", "isAnonymous": True}, headers={"x-client-id": "c1"})
    assert r.json()["author"] == "Anonymous"
    dup = client.post(f"/api/memories/{mid}/comments", json={"text": "Nice one"}, headers={"x-client-id": "c1"})
    assert dup.status_code == 429
    assert client.post(f"/api/memories/{mid}/comments", json={"text": "x", "website": "bot"}).status_code == 400
    assert client.post(f"/api/memories/{mid}/comments", json={"text": ""}).status_code == 422
    assert client.post("/api/memories/000000000000000000000000/comments", json={"text": "hi"}).status_code == 404
    listing = client.get(f"/api/memories/{mid}/comments").json()
    assert listing["total"] == 2 and listing["items"][0]["text"] == "Good times"
    assert client.get(f"/api/memories/{mid}").json()["commentCount"] == 2


def test_bad_ids(client):
    assert client.get("/api/memories/not-an-id").status_code == 404


def test_rate_limit_on_posting(client, jpeg, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "rate_post_limit", 2)
    assert post_memory(client, jpeg).status_code == 201
    assert post_memory(client, jpeg).status_code == 201
    r = post_memory(client, jpeg)
    assert r.status_code == 429 and "Retry-After" in r.headers


def test_reports_auto_hide_and_admin_flow(client, jpeg):
    mid = post_memory(client, jpeg).json()["id"]
    assert client.post(f"/api/memories/{mid}/report", json={"reason": "rude"}, headers={"x-client-id": "r1"}).status_code == 200
    again = client.post(f"/api/memories/{mid}/report", json={}, headers={"x-client-id": "r1"}).json()
    assert "already" in again["message"]
    assert client.get(f"/api/memories/{mid}").status_code == 200  # one reporter can't hide it
    client.post(f"/api/memories/{mid}/report", json={}, headers={"x-client-id": "r2"})
    assert client.get(f"/api/memories/{mid}").status_code == 404  # threshold (2) reached
    assert client.get("/api/memories").json()["total"] == 0

    assert client.get("/api/admin/memories").status_code == 401
    assert client.get("/api/admin/memories", headers={"x-admin-key": "wrong"}).status_code == 401
    queue = client.get("/api/admin/memories", headers=ADMIN).json()
    assert queue["total"] == 1 and queue["items"][0]["isHidden"] and queue["items"][0]["reportCount"] == 2

    restored = client.patch(f"/api/admin/memories/{mid}", json={"isHidden": False, "dismissReports": True}, headers=ADMIN).json()
    assert not restored["isHidden"] and restored["reportCount"] == 0
    assert client.get(f"/api/memories/{mid}").status_code == 200

    assert client.delete(f"/api/admin/memories/{mid}", headers=ADMIN).status_code == 200
    assert client.get(f"/api/memories/{mid}").status_code == 404


def test_admin_comment_moderation_keeps_counts(client, jpeg):
    mid = post_memory(client, jpeg).json()["id"]
    cid = client.post(f"/api/memories/{mid}/comments", json={"text": "hello world"}).json()["id"]
    assert client.get(f"/api/memories/{mid}").json()["commentCount"] == 1
    client.patch(f"/api/admin/comments/{cid}", json={"isHidden": True}, headers=ADMIN)
    assert client.get(f"/api/memories/{mid}").json()["commentCount"] == 0
    assert client.get(f"/api/memories/{mid}/comments").json()["total"] == 0
    client.patch(f"/api/admin/comments/{cid}", json={"isHidden": False}, headers=ADMIN)
    assert client.get(f"/api/memories/{mid}").json()["commentCount"] == 1
    assert client.delete(f"/api/admin/comments/{cid}", headers=ADMIN).status_code == 200
    assert client.get(f"/api/memories/{mid}").json()["commentCount"] == 0


def test_categories_and_featured(client, jpeg):
    a = post_memory(client, jpeg, category="Graduation").json()
    post_memory(client, jpeg, category="Graduation")
    client.put(f"/api/memories/{a['id']}/like", json={"liked": True}, headers={"x-client-id": "f1"})
    cats = client.get("/api/memories/categories").json()
    assert cats["total"] == 2
    assert {c["name"]: c["count"] for c in cats["items"]}["Graduation"] == 2
    assert len(cats["items"]) == 10
    assert client.get("/api/memories/featured").json()["items"][0]["id"] == a["id"]


def test_security_headers_and_health(client):
    r = client.get("/api/health")
    assert r.json() == {"status": "ok"} and r.headers["x-content-type-options"] == "nosniff"
