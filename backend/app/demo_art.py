"""Procedurally drawn illustrations used as placeholder images for demo memories.

They are clearly illustrations, not photographs, and carry a small "demo" label.
"""
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _sky(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=_lerp(top, bottom, y / h))
    return img, d


def _hills(d, w, h, base, color, amp, seed, phase=0.0):
    rnd = random.Random(seed)
    f1, f2 = rnd.uniform(1.2, 2.2), rnd.uniform(3, 5)
    pts = [(0, h)]
    for x in range(0, w + 8, 8):
        y = base + amp * math.sin(x / w * math.pi * f1 + phase) + amp * 0.35 * math.sin(x / w * math.pi * f2 + phase * 2)
        pts.append((x, y))
    pts.append((w, h))
    d.polygon(pts, fill=color)


def _tree(d, x, y, s, leaf=(54, 98, 70), trunk=(80, 58, 42)):
    d.rectangle([x - s * 0.06, y - s * 0.35, x + s * 0.06, y], fill=trunk)
    for dx, dy, r in [(0, -0.62, 0.34), (-0.2, -0.45, 0.26), (0.2, -0.47, 0.27)]:
        d.ellipse([x + dx * s - r * s, y + dy * s - r * s, x + dx * s + r * s, y + dy * s + r * s], fill=leaf)


def _building(d, x, y, bw, bh, wall, roof, windows=(255, 232, 160)):
    d.rectangle([x, y - bh, x + bw, y], fill=wall)
    d.polygon([(x - bw * 0.04, y - bh), (x + bw * 0.5, y - bh - bh * 0.22), (x + bw * 1.04, y - bh)], fill=roof)
    cols = max(3, int(bw // 70))
    gap = bw / (cols + 1)
    for c in range(cols):
        wx = x + gap * (c + 1)
        for r in range(2):
            wy = y - bh * (0.82 - r * 0.38)
            d.rounded_rectangle([wx - 14, wy, wx + 14, wy + 40], radius=12, fill=windows)
    d.rounded_rectangle([x + bw / 2 - 28, y - 90, x + bw / 2 + 28, y], radius=26, fill=(88, 64, 48))


def _sun(img, cx, cy, r, color):
    glow = Image.new("RGB", img.size, (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([cx - r * 2.2, cy - r * 2.2, cx + r * 2.2, cy + r * 2.2], fill=tuple(int(c * 0.35) for c in color))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 0.8))
    from PIL import ImageChops

    img.paste(ImageChops.add(img, glow))
    ImageDraw.Draw(img).ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def _person(d, x, y, s, shirt, skin=(226, 178, 140), hair=(48, 36, 32)):
    d.rounded_rectangle([x - s * 0.22, y - s * 0.62, x + s * 0.22, y], radius=s * 0.12, fill=shirt)
    d.ellipse([x - s * 0.17, y - s * 0.9, x + s * 0.17, y - s * 0.58], fill=skin)
    d.pieslice([x - s * 0.18, y - s * 0.94, x + s * 0.18, y - s * 0.6], 180, 360, fill=hair)


def _bunting(d, w, y, colors, n=9, sag=40):
    for i in range(n):
        x0, x1 = w * i / n, w * (i + 1) / n
        for k in range(4):
            t0 = k / 4
            xa = x0 + (x1 - x0) * t0
            xb = x0 + (x1 - x0) * (t0 + 0.2)
            ya = y + sag * math.sin(math.pi * (xa / (w / n)) % math.pi)
            d.polygon([(xa, ya), (xb, ya), ((xa + xb) / 2, ya + 46)], fill=colors[(i * 4 + k) % len(colors)])


def _cap(d, x, y, s, color=(36, 44, 40)):
    d.polygon([(x - s, y), (x, y - s * 0.38), (x + s, y), (x, y + s * 0.38)], fill=color)
    d.rectangle([x - s * 0.42, y + s * 0.18, x + s * 0.42, y + s * 0.5], fill=color)
    d.line([(x, y), (x + s * 0.8, y + s * 0.15), (x + s * 0.8, y + s * 0.6)], fill=(232, 196, 90), width=max(2, int(s * 0.05)))


# ------------------------------------------------------------------ scenes
def campus_sunset(w, h):
    img, d = _sky(w, h, (246, 190, 150), (196, 170, 210))
    _sun(img, w * 0.7, h * 0.52, w * 0.09, (255, 236, 190))
    d = ImageDraw.Draw(img)
    _hills(d, w, h, h * 0.62, (140, 150, 160), 24, 1)
    _hills(d, w, h, h * 0.7, (96, 124, 104), 18, 2, 1)
    _building(d, w * 0.18, h * 0.8, w * 0.52, h * 0.2, (238, 220, 190), (120, 84, 70))
    d.rectangle([w * 0.38, h * 0.47, w * 0.46, h * 0.6], fill=(238, 220, 190))
    d.ellipse([w * 0.395, h * 0.5, w * 0.445, h * 0.5 + w * 0.05], fill=(255, 250, 235))
    _hills(d, w, h, h * 0.84, (58, 94, 70), 10, 3, 2)
    for x in (0.08, 0.84, 0.94):
        _tree(d, w * x, h * 0.88, w * 0.26)
    return img


def friends_bench(w, h):
    img, d = _sky(w, h, (36, 64, 84), (240, 164, 120))
    for i in range(14):
        x = w * (0.05 + i * 0.068)
        y = h * 0.14 + 22 * math.sin(i / 14 * math.pi * 3)
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(255, 226, 150))
    d.line([(0, h * 0.14)] + [(w * (0.05 + i * 0.068), h * 0.14 + 22 * math.sin(i / 14 * math.pi * 3)) for i in range(14)], fill=(70, 60, 50), width=2)
    _hills(d, w, h, h * 0.66, (46, 78, 70), 22, 4)
    d.rectangle([0, h * 0.78, w, h], fill=(70, 98, 74))
    d.rectangle([w * 0.12, h * 0.7, w * 0.88, h * 0.73], fill=(104, 74, 52))
    d.rectangle([w * 0.12, h * 0.6, w * 0.88, h * 0.62], fill=(104, 74, 52))
    for x in (0.18, 0.5, 0.82):
        d.rectangle([w * x - 8, h * 0.73, w * x + 8, h * 0.82], fill=(70, 50, 38))
    for x, c in ((0.3, (214, 120, 100)), (0.45, (240, 220, 170)), (0.6, (120, 170, 200)), (0.72, (160, 200, 150))):
        _person(d, w * x, h * 0.7, w * 0.3, c)
    return img


def lecture_hall(w, h):
    img, d = _sky(w, h, (232, 220, 192), (206, 190, 160))
    d.rectangle([w * 0.1, h * 0.14, w * 0.9, h * 0.5], fill=(88, 70, 52))
    d.rectangle([w * 0.12, h * 0.16, w * 0.88, h * 0.48], fill=(48, 84, 68))
    rnd = random.Random(7)
    for i in range(6):
        y = h * (0.2 + i * 0.045)
        x = w * 0.16
        for _ in range(rnd.randint(3, 6)):
            seg = rnd.randint(20, 90)
            d.line([(x, y), (x + seg, y + rnd.randint(-4, 4))], fill=(236, 240, 226), width=4)
            x += seg + 16
    d.arc([w * 0.6, h * 0.34, w * 0.8, h * 0.46], 200, 340, fill=(236, 240, 226), width=4)
    for row in range(4):
        y = h * (0.6 + row * 0.1)
        for col in range(5):
            x = w * (0.1 + col * 0.19 + (row % 2) * 0.04)
            d.rounded_rectangle([x, y, x + w * 0.16, y + h * 0.05], radius=8, fill=(150, 112, 78))
            d.rectangle([x + 8, y + h * 0.05, x + 14, y + h * 0.09], fill=(110, 80, 56))
            d.rectangle([x + w * 0.16 - 14, y + h * 0.05, x + w * 0.16 - 8, y + h * 0.09], fill=(110, 80, 56))
    return img


def farewell_gate(w, h):
    img, d = _sky(w, h, (252, 214, 206), (255, 244, 220))
    _sun(img, w * 0.5, h * 0.4, w * 0.07, (255, 250, 232))
    d = ImageDraw.Draw(img)
    d.rectangle([0, h * 0.78, w, h], fill=(176, 188, 150))
    d.rectangle([w * 0.1, h * 0.3, w * 0.24, h * 0.8], fill=(176, 120, 96))
    d.rectangle([w * 0.76, h * 0.3, w * 0.9, h * 0.8], fill=(176, 120, 96))
    d.pieslice([w * 0.1, h * 0.14, w * 0.9, h * 0.62], 180, 360, fill=(176, 120, 96))
    d.pieslice([w * 0.24, h * 0.26, w * 0.76, h * 0.62], 180, 360, fill=(252, 232, 214))
    rnd = random.Random(11)
    for _ in range(90):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h * 0.9)
        c = rnd.choice([(244, 190, 90), (122, 170, 132), (232, 140, 130), (140, 170, 210)])
        d.ellipse([x, y, x + 9, y + 9], fill=c)
    _person(d, w * 0.42, h * 0.86, w * 0.34, (96, 140, 112))
    _person(d, w * 0.58, h * 0.86, w * 0.34, (222, 160, 90))
    return img


def festival(w, h):
    img, d = _sky(w, h, (170, 214, 220), (252, 236, 200))
    _bunting(d, w, h * 0.12, [(222, 120, 100), (246, 200, 96), (96, 150, 120), (110, 150, 200)], 8, 36)
    _hills(d, w, h, h * 0.58, (132, 170, 126), 16, 5)
    d.rectangle([0, h * 0.72, w, h], fill=(214, 196, 150))
    for i, c in enumerate([(222, 120, 100), (96, 150, 120), (246, 200, 96)]):
        x = w * (0.06 + i * 0.32)
        d.rectangle([x, h * 0.5, x + w * 0.28, h * 0.74], fill=(250, 244, 228))
        for s in range(7):
            sx = x + s * w * 0.04
            d.polygon([(sx, h * 0.5), (sx + w * 0.04, h * 0.5), (sx + w * 0.045, h * 0.57), (sx - 0.005 * w, h * 0.57)], fill=c if s % 2 == 0 else (250, 244, 228))
        d.rectangle([x + 10, h * 0.62, x + w * 0.28 - 10, h * 0.66], fill=(150, 112, 78))
    for x, c in ((0.2, (96, 140, 112)), (0.55, (214, 120, 100)), (0.82, (110, 150, 200))):
        _person(d, w * x, h * 0.9, w * 0.3, c)
    return img


def chai_break(w, h):
    img, d = _sky(w, h, (250, 214, 168), (236, 176, 128))
    d.rectangle([0, h * 0.68, w, h], fill=(120, 84, 60))
    d.rectangle([0, h * 0.68, w, h * 0.7], fill=(150, 108, 78))
    cx, cy = w * 0.5, h * 0.66
    d.polygon([(cx - w * 0.14, cy - h * 0.16), (cx + w * 0.14, cy - h * 0.16), (cx + w * 0.1, cy), (cx - w * 0.1, cy)], fill=(250, 244, 232))
    d.ellipse([cx - w * 0.14, cy - h * 0.18, cx + w * 0.14, cy - h * 0.14], fill=(176, 108, 68))
    d.arc([cx + w * 0.1, cy - h * 0.14, cx + w * 0.2, cy - h * 0.04], 270, 90, fill=(250, 244, 232), width=int(w * 0.02))
    d.ellipse([cx - w * 0.2, cy - 6, cx + w * 0.2, cy + 18], fill=(236, 226, 206))
    for k, off in enumerate((-0.05, 0.0, 0.05)):
        pts = [(cx + w * off + 14 * math.sin(t / 6 + k), cy - h * 0.2 - t * 3) for t in range(0, 80, 4)]
        d.line(pts, fill=(255, 250, 240), width=6)
    return img


def trip_mountains(w, h):
    img, d = _sky(w, h, (28, 52, 88), (170, 200, 226))
    rnd = random.Random(3)
    for _ in range(50):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h * 0.4)
        d.ellipse([x, y, x + 3, y + 3], fill=(255, 250, 230))
    for base, col, seed in ((0.52, (110, 134, 170), 1), (0.62, (74, 102, 128), 2)):
        pts = [(0, h)]
        r = random.Random(seed)
        x = 0
        while x <= w:
            pts.append((x, h * base - r.uniform(0.04, 0.2) * h))
            x += w / 7
        pts += [(w, h * base), (w, h)]
        d.polygon(pts, fill=col)
    d.polygon([(w * 0.5, h * 0.3), (w * 0.38, h * 0.62), (w * 0.62, h * 0.62)], fill=(92, 120, 150))
    d.polygon([(w * 0.5, h * 0.3), (w * 0.455, h * 0.4), (w * 0.545, h * 0.4)], fill=(246, 248, 250))
    d.rectangle([0, h * 0.76, w, h], fill=(58, 92, 70))
    d.polygon([(w * 0.22, h * 0.9), (w * 0.34, h * 0.9), (w * 0.28, h * 0.78)], fill=(236, 150, 90))
    d.polygon([(w * 0.28, h * 0.9), (w * 0.31, h * 0.9), (w * 0.28, h * 0.8)], fill=(120, 70, 46))
    for x in (0.7, 0.8, 0.9):
        _tree(d, w * x, h * 0.9, w * 0.2, leaf=(40, 78, 58))
    return img


def graduation(w, h):
    img, d = _sky(w, h, (150, 196, 226), (250, 236, 208))
    rnd = random.Random(5)
    for _ in range(70):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        c = rnd.choice([(244, 190, 90), (122, 170, 132), (232, 140, 130), (255, 255, 255)])
        d.rectangle([x, y, x + 8, y + 14], fill=c)
    for x, y, s in ((0.25, 0.28, 0.2), (0.62, 0.18, 0.16), (0.78, 0.42, 0.18), (0.42, 0.52, 0.14)):
        _cap(d, w * x, h * y, w * s)
    d.rectangle([0, h * 0.82, w, h], fill=(96, 138, 104))
    for i, x in enumerate((0.22, 0.38, 0.54, 0.7)):
        _person(d, w * x, h * 0.93, w * 0.3, (38, 46, 42) if i % 2 else (56, 70, 62))
    return img


def library(w, h):
    img, d = _sky(w, h, (222, 202, 168), (190, 160, 124))
    d.pieslice([w * 0.28, h * 0.08, w * 0.72, h * 0.5], 180, 360, fill=(254, 238, 190))
    d.rectangle([w * 0.28, h * 0.29, w * 0.72, h * 0.5], fill=(254, 238, 190))
    d.line([(w * 0.5, h * 0.08), (w * 0.5, h * 0.5)], fill=(150, 112, 78), width=8)
    palette = [(176, 84, 72), (86, 130, 104), (220, 170, 84), (96, 124, 160), (140, 100, 150), (234, 224, 200)]
    rnd = random.Random(9)
    for shelf in range(3):
        y = h * (0.56 + shelf * 0.15)
        d.rectangle([0, y + h * 0.12, w, y + h * 0.135], fill=(104, 76, 54))
        x = 0
        while x < w:
            bw, bh = rnd.randint(18, 40), rnd.randint(int(h * 0.07), int(h * 0.12))
            d.rectangle([x, y + h * 0.12 - bh, x + bw, y + h * 0.12], fill=rnd.choice(palette))
            x += bw + 2
    return img


def rain_campus(w, h):
    img, d = _sky(w, h, (126, 150, 148), (196, 208, 192))
    _hills(d, w, h, h * 0.58, (98, 126, 110), 20, 6)
    _building(d, w * 0.1, h * 0.72, w * 0.8, h * 0.18, (206, 200, 180), (96, 98, 96), windows=(242, 224, 160))
    d.rectangle([0, h * 0.72, w, h], fill=(120, 132, 126))
    rnd = random.Random(2)
    for _ in range(140):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h * 0.8)
        d.line([(x, y), (x - 6, y + 26)], fill=(226, 236, 236), width=2)
    for x, c in ((0.22, (222, 120, 100)), (0.5, (246, 200, 96)), (0.76, (110, 150, 200))):
        cx, cy = w * x, h * 0.78
        d.pieslice([cx - w * 0.12, cy - w * 0.12, cx + w * 0.12, cy + w * 0.12], 180, 360, fill=c)
        d.line([(cx, cy), (cx, cy + h * 0.12)], fill=(60, 50, 44), width=4)
        d.rounded_rectangle([cx - 10, cy + h * 0.1, cx + 10, cy + h * 0.2], radius=6, fill=(60, 80, 70))
    return img


def exam_morning(w, h):
    img, d = _sky(w, h, (244, 232, 206), (226, 208, 176))
    d.rectangle([0, h * 0.62, w, h], fill=(150, 112, 78))
    for i in range(3):
        x = w * (0.08 + i * 0.3)
        d.rounded_rectangle([x, h * 0.45, x + w * 0.26, h * 0.62], radius=6, fill=(252, 250, 242))
        for l in range(6):
            d.line([(x + 14, h * 0.48 + l * 14), (x + w * 0.26 - 14, h * 0.48 + l * 14)], fill=(190, 196, 206), width=2)
    d.rounded_rectangle([w * 0.62, h * 0.54, w * 0.74, h * 0.6], radius=8, fill=(58, 94, 70))
    d.rounded_rectangle([w * 0.64, h * 0.4, w * 0.7, h * 0.54], radius=6, fill=(232, 196, 90))
    d.ellipse([w * 0.78, h * 0.5, w * 0.9, h * 0.62], fill=(250, 244, 232))
    d.arc([w * 0.72, h * 0.12, w * 0.92, h * 0.32], 0, 360, fill=(120, 90, 60), width=4)
    d.line([(w * 0.82, h * 0.22), (w * 0.82, h * 0.16)], fill=(120, 90, 60), width=4)
    d.line([(w * 0.82, h * 0.22), (w * 0.86, h * 0.24)], fill=(120, 90, 60), width=4)
    return img


SCENES = {
    "campus_sunset": (campus_sunset, (1000, 1240)),
    "friends_bench": (friends_bench, (1200, 900)),
    "lecture_hall": (lecture_hall, (1100, 800)),
    "farewell_gate": (farewell_gate, (1000, 1300)),
    "festival": (festival, (1200, 1000)),
    "chai_break": (chai_break, (1000, 1000)),
    "trip_mountains": (trip_mountains, (1200, 800)),
    "graduation": (graduation, (1000, 1200)),
    "library": (library, (1000, 1100)),
    "rain_campus": (rain_campus, (1100, 900)),
    "exam_morning": (exam_morning, (1000, 800)),
}


def render(name: str) -> Image.Image:
    fn, (w, h) = SCENES[name]
    img = fn(w, h)
    d = ImageDraw.Draw(img, "RGBA")
    try:
        font = ImageFont.load_default(size=22)
    except TypeError:  # very old Pillow
        font = ImageFont.load_default()
    label = "demo illustration"
    box = d.textbbox((0, 0), label, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.rounded_rectangle([18, h - th - 44, 18 + tw + 28, h - 18], radius=14, fill=(255, 252, 244, 200))
    d.text((32, h - th - 36), label, font=font, fill=(60, 72, 64, 255))
    return img


if __name__ == "__main__":  # python -m app.demo_art ../frontend/public/demo-art
    import sys
    from pathlib import Path

    out = Path(sys.argv[1] if len(sys.argv) > 1 else "demo-art")
    out.mkdir(parents=True, exist_ok=True)
    for n in SCENES:
        render(n).save(out / f"{n}.jpg", "JPEG", quality=82, optimize=True)
        print("wrote", out / f"{n}.jpg")
