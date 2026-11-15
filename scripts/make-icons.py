# Genera le icone PWA in public/ ("MM" rosso su bianco). Uso: python scripts/make-icons.py
from PIL import Image, ImageDraw, ImageFont

RED = (213, 15, 37)
FONT = "C:/Windows/Fonts/arialbd.ttf"


def make(size, text_ratio, name):
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(size * text_ratio))
    box = d.textbbox((0, 0), "MM", font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), "MM", font=font, fill=RED)
    img.save(f"public/{name}", optimize=True)


make(192, 0.46, "pwa-192x192.png")
make(512, 0.46, "pwa-512x512.png")
# maskable: contenuto dentro la safe zone (cerchio di raggio 40%)
make(512, 0.34, "pwa-maskable-512x512.png")
make(180, 0.46, "apple-touch-icon.png")
