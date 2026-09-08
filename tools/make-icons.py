"""Генератор icons/icon128.png и icons/icon48.png для R.Db.

Логотип: скруглённый квадрат, диагональный градиент индиго -> фиолет,
стеклянный блик, белая сетка 2x2, синяя папка на верхней правой плитке.

Требуется Pillow:  pip install pillow
Запуск из корня проекта:  python tools/make-icons.py
"""
from PIL import Image, ImageDraw
import os

S = 512
TOP = (108, 140, 255)
BOT = (157, 123, 255)
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')

base = Image.new('RGB', (S, S))
px = base.load()
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * S - 2)
        px[x, y] = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
base = base.convert('RGBA')

mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, S, S], radius=int(S * 0.24), fill=255)
base.putalpha(mask)

hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ImageDraw.Draw(hl).rounded_rectangle(
    [-S * 0.1, -S * 0.35, S * 0.75, S * 0.30],
    radius=int(S * 0.2), fill=(255, 255, 255, 30))
base = Image.alpha_composite(base, hl)
dr = ImageDraw.Draw(base)

m = S * 0.24
gap = S * 0.05
cell = (S - 2 * m - gap) / 2
tr = int(cell * 0.22)
tiles = []
for i in range(2):
    for j in range(2):
        x0 = m + i * (cell + gap)
        y0 = m + j * (cell + gap)
        tiles.append((x0, y0))
        dr.rounded_rectangle([x0, y0, x0 + cell, y0 + cell], radius=tr, fill=(255, 255, 255, 255))

x0, y0 = tiles[2]  # верхняя правая плитка (i=1, j=0)
p = cell * 0.22
fx, fy = x0 + p, y0 + p
fw, fh = cell - 2 * p, (cell - 2 * p) * 0.78
fy += (cell - fh) / 2
dark = (88, 108, 238, 255)
lite = (120, 140, 255, 255)
dr.rectangle([fx, fy, fx + fw * 0.42, fy + fh * 0.28], fill=dark)
dr.rectangle([fx, fy + fh * 0.14, fx + fw, fy + fh], fill=dark)
dr.rounded_rectangle([fx, fy + fh * 0.22, fx + fw, fy + fh], radius=int(fh * 0.12), fill=lite)

os.makedirs(OUT, exist_ok=True)
for size in (128, 48):
    base.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f'icon{size}.png'))
    print('saved icon%d.png' % size)
