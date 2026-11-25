# UAF Memory Wall

*Every picture has a story. Every story deserves a place.*

A no-login digital wall for university photographs and stories. Visitors browse a scrapbook-style masonry of polaroids, search and filter by category, like, comment, and share their own memories with a name or anonymously. No registration, no accounts, no email.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS 3, React Router |
| Backend | Python 3.12, FastAPI, Motor (async MongoDB) |
| Database | MongoDB Atlas |
| Images | Cloudinary (only URLs and metadata go into MongoDB) |
| Hosting | Vercel (frontend), Render (backend) |

```
uaf-memory-wall/
├─ backend/
│  ├─ app/
│  │  ├─ main.py          app, CORS, security headers, error format
│  │  ├─ config.py        environment settings and startup checks
│  │  ├─ db.py            Mongo connection and indexes
│  │  ├─ security.py      sanitising, spam checks, rate limiter, admin auth
│  │  ├─ images.py        image validation, EXIF stripping, resize
│  │  ├─ storage.py       Cloudinary (or local folder in dev)
│  │  ├─ serializers.py   document -> JSON
│  │  ├─ routers/         memories.py, comments.py, admin.py
│  │  ├─ seed.py          labelled demo content (add / purge)
│  │  └─ demo_art.py      draws the demo illustrations
│  ├─ tests/              14 API tests (pytest)
│  ├─ .env.example  render.yaml  requirements.txt  requirements-dev.txt
├─ frontend/
│  ├─ src/                components, pages, hooks, lib, context
│  ├─ src/smoke.test.jsx  UI smoke test against a running backend
│  ├─ .env.example  vercel.json  tailwind.config.js  vite.config.js
└─ README.md
```

## 1. Run it locally

### Quickest: no Atlas or Cloudinary account needed
Uses an in-memory database and a local image folder, with clearly marked demo memories.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cat > .env <<'ENV'
USE_MOCK_DB=true
STORAGE_BACKEND=local
SEED_DEMO_ON_START=true
ADMIN_API_KEY=local-admin-key
ENV
uvicorn app.main:app --reload --port 8000
```
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (Vite proxies /api and /media to port 8000)
```
Data is lost when the backend restarts. API docs: http://localhost:8000/docs. Moderation: http://localhost:5173/admin with the key above.

### With the real services
Copy `backend/.env.example` to `backend/.env`, fill in your Atlas and Cloudinary values (sections 3 and 4), remove `USE_MOCK_DB` and set `STORAGE_BACKEND=cloudinary`. Optionally add demo content with `python -m app.seed` and remove it later with `python -m app.seed --purge`.

### Tests
```bash
cd backend && pytest                    # API tests (mock database, local storage)
cd frontend && npm test                 # needs the backend running with demo data and
                                        # CORS_ORIGINS including http://localhost:3000
```

## 2. How the main features work

* **Anonymous or named.** Anonymous toggle on, or no name given, stores no name at all and the API returns "Anonymous". Neither email nor account data is requested.
* **Likes without accounts.** The database keeps one like per `(memory, voter)` under a unique index. A voter is a salted SHA-256 of IP address plus a random id kept in the browser, so raw IPs are not stored. Liking is idempotent, and the API reports `likedByMe`. Someone determined can still bypass this with a new browser id and IP, which is the honest limit without accounts. Rate limits make abuse costly.
* **Search, filter, sort, infinite scroll.** `q` matches title, description and public author names (escaped, case-insensitive). Sort by newest, oldest or most liked. The wall loads 12 at a time as you scroll.
* **Masonry.** Columns are balanced from photo proportions, and each card gets a stable tilt and pinning style (pin, tape, sticky note) from its id.
* **Share links.** `/m/<id>` opens the memory directly. The Share button uses the native share sheet where available, otherwise copies the link.

## 3. Security and privacy

* Every input is validated by the backend (Pydantic plus explicit checks). Text is stripped of HTML tags, control and bidi characters. React also escapes everything on render.
* Uploads: JPG/PNG/WebP only, 8 MB each, up to 6 per memory. Each file is opened with Pillow, rotated, resized to 2400 px, and **re-encoded**, which rejects disguised files and removes EXIF data such as GPS location.
* Rate limits per visitor (defaults): 5 posts/hour, 10 comments/10 min, 60 likes/10 min, 10 reports/hour, 240 reads/min. Configurable by environment variable. The limiter is in memory, so for more than one backend instance use Redis.
* Spam: hidden honeypot fields, link limit, repeated-character check, duplicate-comment check, optional `BLOCKED_WORDS`.
* Moderation: every memory and comment has a report button. Different visitors reporting the same item hide it automatically at `REPORT_HIDE_THRESHOLD` (default 3). Moderators use `/admin` (protected by `ADMIN_API_KEY`, brute-force limited) to hide, restore, clear reports, or permanently delete (which also removes Cloudinary images).
* Secrets live only in backend environment variables. The frontend has no secrets, and the production config check refuses to start with a default salt, mock database or local storage.
* **Anonymity is not absolute.** Anonymous means the public interface does not show a name. Your host, Atlas and Cloudinary may keep standard technical logs such as IP addresses. The About section says so.

## 4. Deployment

### MongoDB Atlas
1. Create a free cluster at cloud.mongodb.com.
2. Database Access: add a user with a strong password and the `readWrite` role on the database.
3. Network Access: allow the IPs your backend runs from. Render's free tier has no fixed IP, so use `0.0.0.0/0` and rely on a strong password. A paid plan with fixed outbound IPs allows tighter rules.
4. Connect, then Drivers, and copy the `mongodb+srv://...` string into `MONGODB_URI`. Collections and indexes are created automatically on first start.

Collections: `memories` (title, description, images[], authorName, isAnonymous, category, likes, commentCount, reportCount, isHidden, isDemo, createdAt), `comments` (memoryId ObjectId, text, authorName, isAnonymous, reportCount, isHidden, createdAt), plus `likes` and `reports` for de-duplication.

### Cloudinary
1. Create a free account. On the dashboard, copy Cloud name, API Key and API Secret into `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
2. Photos are stored under the `uaf-memory-wall` folder. Delivery URLs automatically use `f_auto,q_auto` and resized widths.

### Backend on Render
1. Push this repo to GitHub. In Render choose New, then Blueprint, and select the repo (it reads `backend/render.yaml`), or create a Web Service manually with root `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers`.
2. Fill the environment variables from `backend/.env.example`. Required: `MONGODB_URI`, the three Cloudinary values, `CORS_ORIGINS`, `ADMIN_API_KEY`, `SECRET_SALT`, with `APP_ENV=production` and `TRUST_PROXY=true`.
3. Check `https://<service>.onrender.com/api/health` returns `{"status":"ok"}`. Free instances sleep when idle, so the first request can take about 30 seconds.

### Frontend on Vercel
1. Import the repo in Vercel and set **Root Directory** to `frontend` (framework: Vite, build `npm run build`, output `dist`).
2. Add environment variable `VITE_API_URL=https://<service>.onrender.com` (no trailing slash, no `/api`).
3. Deploy. `vercel.json` rewrites all routes to `index.html` so `/m/<id>` links work.

### CORS
Set the backend's `CORS_ORIGINS` to your exact frontend origins, comma separated and without trailing slashes, for example `https://uaf-memory-wall.vercel.app,https://yourdomain.com`. Redeploy the backend after changing it. Vercel preview URLs differ per deployment, so add them if you test previews.

### Production build locally
```bash
cd frontend && VITE_API_URL=https://<service>.onrender.com npm run build && npm run preview
```

## 5. API reference
Interactive docs: `/docs` (Swagger) and `/redoc` on the backend. Errors are always `{"detail": "<message>"}`. Send a stable `X-Client-Id` header (the frontend does) so likes and reports de-duplicate.

| Method and path | Purpose |
|---|---|
| `GET /api/memories?q&category&sort&page&limit` | List and search. `sort`: newest, oldest, popular. Returns `items, page, total, hasMore` |
| `GET /api/memories/featured?limit` | Popular and discussed memories |
| `GET /api/memories/categories` | Categories with counts |
| `GET /api/memories/{id}` | One memory |
| `POST /api/memories` | Multipart: `images` (1 to 6 files), `description`, `category`, optional `title`, `authorName`, `isAnonymous`. Honeypot field `website` must stay empty |
| `PUT /api/memories/{id}/like` | Body `{"liked": true\|false}`. Idempotent |
| `GET /api/memories/{id}/comments?page` | Comments, oldest first |
| `POST /api/memories/{id}/comments` | Body `{text, authorName?, isAnonymous?}` |
| `POST /api/memories/{id}/report`, `POST /api/comments/{id}/report` | Body `{reason?}` |
| `GET /api/config`, `GET /api/health` | Public limits and categories, health check |
| `GET /api/admin/memories\|comments?filter=reported\|hidden\|all` | Moderation queue (header `X-Admin-Key`) |
| `PATCH /api/admin/memories\|comments/{id}` | `{isHidden?, dismissReports?}` |
| `DELETE /api/admin/memories\|comments/{id}` | Permanent delete (also removes images) |

Status codes: 201 created, 404 missing or hidden, 413 file too large, 422 validation, 429 rate limited (with `Retry-After`), 401 bad admin key.

## 6. Demo content
`python -m app.seed` adds 11 illustrated sample memories flagged `isDemo`. The interface stamps them "Demo". They are drawings, not photographs, they start with zero likes, and `--purge` removes them. The hero collage also uses these illustrations and is labelled "illustrated samples". Delete `frontend/public/demo-art` and the `FRAMES` list in `Hero.jsx` when you have real photographs to feature.

## 7. Known limits and next steps
* Search uses regular expressions, which is fine for thousands of memories. For much larger walls, move to Atlas Search.
* Rate limiting is per process. Use Redis if you run several instances.
* Shared links do not carry per-memory social preview images, because the site is a client-rendered SPA. Add a small serverless route that returns Open Graph tags if you want rich previews.
* HEIC photos are not accepted. Phones normally convert to JPEG when the browser uploads.
