#!/usr/bin/env python3
"""
Slice a Muushig contact sheet (parchment background, regular grid of cards or
avatars) into individual PNG assets.

The card/avatar positions drift between AI-generated sheets and the cards are
often slightly tilted, so we don't hard-code pixel boxes: we split the sheet
into an even grid of cells and, inside each cell, auto-detect the content's
bounding box by distance from the cell's corner (background) colour.

Usage:
  # Court cards: 2 cols x 2 rows, order K Q / J A, target 5:7, suit suffix C
  slice_assets.py cards-clubs-sheet.png out/cards \\
      --cols 2 --rows 2 --ratio 5:7 --names KC,QC,JC,AC

  # Avatars: 4 cols x 2 rows, square, drop the text label under each tile
  slice_assets.py avatars-sheet.png out/avatars \\
      --cols 4 --rows 2 --ratio 1:1 --drop-label \\
      --names bot-1,bot-2,bot-3,bot-4,bot-5,bot-6,bot-7,bot-8 --size 256
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

# --- colour detection (good for high-contrast tiles like avatars) ---
# How far a pixel must be from the cell background (euclidean RGB) to count as
# content.
CONTENT_THRESHOLD = 26
# Min fraction of a row/column that must be content for that row/col to count.
PROJ_FRACTION = 0.04

# --- edge detection (good for cards: a card border + ink art give strong
# gradients, while textured parchment stays smooth, so we don't get fooled by
# paper grain the way colour-distance does) ---
EDGE_THRESHOLD = 22          # gradient magnitude to count a pixel as an edge
EDGE_PROJ_FRACTION = 0.05    # fraction of a row/col that must be edges


def cell_bg(cell: np.ndarray) -> np.ndarray:
    """Estimate the cell's background colour from its four corner patches."""
    h, w, _ = cell.shape
    k = max(4, min(h, w) // 20)
    corners = np.concatenate([
        cell[:k, :k].reshape(-1, 3),
        cell[:k, -k:].reshape(-1, 3),
        cell[-k:, :k].reshape(-1, 3),
        cell[-k:, -k:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def runs(mask_1d: np.ndarray):
    """Yield (start, end_exclusive) contiguous True runs in a 1-D bool array."""
    idx = np.flatnonzero(mask_1d)
    if idx.size == 0:
        return []
    breaks = np.flatnonzero(np.diff(idx) > 1)
    starts = np.concatenate([[idx[0]], idx[breaks + 1]])
    ends = np.concatenate([idx[breaks], [idx[-1]]])
    return list(zip(starts.tolist(), (ends + 1).tolist()))


def _mask_color(cell: np.ndarray):
    bg = cell_bg(cell)
    dist = np.sqrt(((cell.astype(np.float32) - bg) ** 2).sum(axis=2))
    return dist > CONTENT_THRESHOLD, PROJ_FRACTION


def _mask_edges(cell: np.ndarray):
    """Gradient-magnitude mask: card border + ink art light up, parchment grain
    (smooth, low-amplitude) does not — so the bbox locks onto the real card."""
    gray = cell.astype(np.float32).mean(axis=2)
    gx = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
    gy = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
    return (gx + gy) > EDGE_THRESHOLD, EDGE_PROJ_FRACTION


def content_bbox(cell: np.ndarray, drop_label: bool, detect: str):
    """Return (x0, y0, x1, y1) of the content inside a cell, or None.

    Both axes keep only the *largest contiguous run* of "on" rows/cols, so a
    neighbouring card bleeding past the cell edge or a stray speck can't drag
    the box across an empty parchment gap.
    """
    mask, frac = _mask_edges(cell) if detect == "edges" else _mask_color(cell)
    h, w = mask.shape

    row_on = mask.sum(axis=1) > (w * frac)
    row_runs = runs(row_on)
    if not row_runs:
        return None
    # drop_label or not, the card/tile is the *tallest* run; labels and stray
    # marks are shorter. (For cards this is just the card.)
    y0, y1 = max(row_runs, key=lambda r: r[1] - r[0])

    band = mask[y0:y1]
    col_on = band.sum(axis=0) > ((y1 - y0) * frac)
    col_runs = runs(col_on)
    if not col_runs:
        return None
    x0, x1 = max(col_runs, key=lambda r: r[1] - r[0])
    return x0, y0, x1, y1


def pad_to_ratio(box, ratio_w, ratio_h, cell_w, cell_h, cx0, cy0):
    """Expand a bbox (cell-local) to the target W:H ratio, clamped to the cell."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0
    target = ratio_w / ratio_h
    if bw / bh < target:                 # too tall -> widen
        new_w = bh * target
        cx = (x0 + x1) / 2
        x0, x1 = cx - new_w / 2, cx + new_w / 2
    else:                                # too wide -> heighten
        new_h = bw / target
        cy = (y0 + y1) / 2
        y0, y1 = cy - new_h / 2, cy + new_h / 2
    # clamp to cell, translate to sheet coords
    x0 = max(0, int(round(x0))); y0 = max(0, int(round(y0)))
    x1 = min(cell_w, int(round(x1))); y1 = min(cell_h, int(round(y1)))
    return cx0 + x0, cy0 + y0, cx0 + x1, cy0 + y1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("outdir")
    ap.add_argument("--cols", type=int, required=True)
    ap.add_argument("--rows", type=int, required=True)
    ap.add_argument("--names", required=True,
                    help="comma-separated output basenames, row-major")
    ap.add_argument("--ratio", default="5:7", help="target W:H, e.g. 5:7 or 1:1")
    ap.add_argument("--size", type=int, default=0,
                    help="longest output edge in px (0 = native bbox size)")
    ap.add_argument("--pad", type=int, default=8,
                    help="extra px of background padding around the bbox")
    ap.add_argument("--drop-label", action="store_true",
                    help="exclude a text label below the tile (avatars)")
    ap.add_argument("--detect", default="edges", choices=["edges", "color"],
                    help="content detection: 'edges' for cards, 'color' for "
                         "high-contrast tiles like avatars (default edges)")
    ap.add_argument("--format", default="webp", choices=["webp", "png"],
                    help="output image format (default webp)")
    ap.add_argument("--quality", type=int, default=82,
                    help="webp quality 1-100 (default 82)")
    args = ap.parse_args()

    names = [n.strip() for n in args.names.split(",") if n.strip()]
    if len(names) != args.cols * args.rows:
        sys.exit(f"need {args.cols*args.rows} names, got {len(names)}")
    rw, rh = (int(x) for x in args.ratio.split(":"))

    img = Image.open(args.sheet).convert("RGB")
    arr = np.asarray(img)
    H, W, _ = arr.shape
    cw, ch = W // args.cols, H // args.rows
    os.makedirs(args.outdir, exist_ok=True)

    n = 0
    for r in range(args.rows):
        for c in range(args.cols):
            cx0, cy0 = c * cw, r * ch
            cell = arr[cy0:cy0 + ch, cx0:cx0 + cw]
            box = content_bbox(cell, args.drop_label, args.detect)
            name = names[n]; n += 1
            if box is None:
                print(f"  ! {name}: no content found, skipped")
                continue
            x0, y0, x1, y1 = box
            x0 -= args.pad; y0 -= args.pad; x1 += args.pad; y1 += args.pad
            fx0, fy0, fx1, fy1 = pad_to_ratio(
                (x0, y0, x1, y1), rw, rh, cw, ch, cx0, cy0)
            crop = img.crop((fx0, fy0, fx1, fy1))
            if args.size:
                if rw >= rh:
                    out = (args.size, round(args.size * rh / rw))
                else:
                    out = (round(args.size * rw / rh), args.size)
                crop = crop.resize(out, Image.LANCZOS)
            path = os.path.join(args.outdir, f"{name}.{args.format}")
            if args.format == "webp":
                crop.save(path, "WEBP", quality=args.quality, method=6)
            else:
                crop.save(path)
            kb = os.path.getsize(path) / 1024
            print(f"  + {name}.{args.format}  {crop.size[0]}x{crop.size[1]}  {kb:.0f}KB")


if __name__ == "__main__":
    main()
