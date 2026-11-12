"""Render the D4 Trip PWA icon from one SVG source."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = (root / "icon.svg").read_bytes()
for name, size in (
    ("apple-touch-icon-v28.png", 180),
    ("icon-192-v28.png", 192),
    ("icon-512-v28.png", 512),
):
    data = cairosvg.svg2png(bytestring=source, output_width=size, output_height=size)
    Image.open(BytesIO(data)).convert("RGB").save(root / name, optimize=True)

canvas = Image.new("RGB", (512, 512), "#F7FAFF")
art = Image.open(BytesIO(cairosvg.svg2png(bytestring=source, output_width=384, output_height=384))).convert("RGB")
canvas.paste(art, (64, 64))
canvas.save(root / "icon-maskable-v28.png", optimize=True)
