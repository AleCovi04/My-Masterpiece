# Genera tutte le icone dal logo (assets/logo.jpeg, rosso su bianco):
# PWA e favicon in public/, icone e schermata di avvio dell'app Android.
# Uso: python scripts/make-icons.py   (richiede Pillow)
import glob
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

SOURCE = "assets/logo.jpeg"
RED = (237, 67, 54)  # colore del logo
RES = "android/app/src/main/res"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def load_mask():
    """Maschera pulita e ad alta risoluzione del logo (bianco = logo)."""
    src = Image.open(SOURCE).convert("RGB")
    big = src.resize((src.width * 4, src.height * 4), Image.LANCZOS)
    # quanto un pixel è "rosso": dal verde (bianco 254, rosso 67)
    g = big.getchannel("G")
    mask = g.point(lambda v: max(0, min(255, round((254 - v) * 255 / (254 - 67)))))
    # bordi netti (via le sbavature del JPEG), poi un filo di anti-aliasing
    mask = mask.filter(ImageFilter.GaussianBlur(2))
    mask = mask.point(lambda v: 255 if v >= 128 else 0)
    mask = mask.filter(ImageFilter.GaussianBlur(1.5))
    return mask.crop(mask.getbbox())


MASK = load_mask()
HALF_DIAG = math.hypot(MASK.width, MASK.height) / 2


def logo(scale):
    size = (max(1, round(MASK.width * scale)), max(1, round(MASK.height * scale)))
    return MASK.resize(size, Image.LANCZOS)


def compose(w, h, scale, bg=(255, 255, 255, 255), color=RED):
    """Logo centrato su uno sfondo w×h."""
    img = Image.new("RGBA", (w, h), bg)
    m = logo(scale)
    fill = Image.new("RGBA", m.size, color + (255,))
    img.paste(fill, ((w - m.width) // 2, (h - m.height) // 2), m)
    return img


def by_height(size, ratio):
    """Scala perché il logo occupi `ratio` dell'altezza."""
    return size * ratio / MASK.height


def in_circle(size, radius_ratio):
    """Scala perché il logo stia tutto in un cerchio di raggio `radius_ratio` × size."""
    return size * radius_ratio / HALF_DIAG


def save(img, path, rgb=True):
    (img.convert("RGB") if rgb else img).save(path, optimize=True)


# ---------- PWA e favicon ----------
save(compose(192, 192, by_height(192, 0.78)), "public/pwa-192x192.png")
save(compose(512, 512, by_height(512, 0.78)), "public/pwa-512x512.png")
# maskable: tutto dentro la safe zone (cerchio di raggio 40%)
save(compose(512, 512, in_circle(512, 0.38)), "public/pwa-maskable-512x512.png")
save(compose(180, 180, by_height(180, 0.72)), "public/apple-touch-icon.png")
save(compose(64, 64, by_height(64, 0.94)), "public/favicon-64.png")

# ---------- Android: icona dell'app ----------
for name, d in DENSITIES.items():
    folder = f"{RES}/mipmap-{name}"
    legacy = round(48 * d)
    save(compose(legacy, legacy, by_height(legacy, 0.74)), f"{folder}/ic_launcher.png")
    # rotonda: cerchio bianco, trasparente fuori
    rnd = compose(legacy, legacy, in_circle(legacy, 0.4))
    circle = Image.new("L", (legacy * 4, legacy * 4), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, legacy * 4 - 1, legacy * 4 - 1), fill=255)
    circle = circle.resize((legacy, legacy), Image.LANCZOS)
    rnd.putalpha(ImageChops.multiply(rnd.getchannel("A"), circle))
    save(rnd, f"{folder}/ic_launcher_round.png", rgb=False)
    # adattiva (Android 8+): primo piano trasparente su sfondo bianco
    # (`ic_launcher_background`); safe zone = cerchio di 66 dp su 108 dp
    fg = round(108 * d)
    save(
        compose(fg, fg, in_circle(fg, 0.29), bg=(255, 255, 255, 0)),
        f"{folder}/ic_launcher_foreground.png",
        rgb=False,
    )

# ---------- Android: icona della notifica (sagoma bianca, 24 dp) ----------
for name, d in DENSITIES.items():
    s = round(24 * d)
    folder = f"{RES}/drawable-{name}"
    os.makedirs(folder, exist_ok=True)
    save(
        compose(s, s, by_height(s, 0.92), bg=(0, 0, 0, 0), color=(255, 255, 255)),
        f"{folder}/ic_stat_rest.png",
        rgb=False,
    )

# ---------- Android: schermata di avvio ----------
for path in glob.glob(f"{RES}/drawable*/splash.png"):
    w, h = Image.open(path).size
    save(compose(w, h, by_height(min(w, h), 0.32)), path)

print("Icone generate.")
