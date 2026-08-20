"""Measure the rendered matte silhouettes.

  python3 measure_silhouettes.py --dir RENDER_DIR

Reads render.json, writes metrics.json. Everything here is measured off the
pixels, so no view can be reported as better than it looks.

Metrics that matter for the gate:
  fill_h / fill_w   framing, and the 55-70% mobile height rule
  solidity          ink over bounding box: a ribbon is thin but solid
  ribbon_score      median mask width over mask height, the Phase 14 killer
  mobile_ceiling    highest fill_h a view can ever reach in a portrait frame
  feather_profile   stalk / belly / taper test for the hero feather close-up
  lobes             outline finger count, a proxy for separated primaries
"""

from __future__ import annotations

import argparse
import json
import math
import os

import numpy as np
from PIL import Image

PORTRAIT_FRAMES = {"390": (390, 844), "430": (430, 932)}


def mask_of(path: str) -> np.ndarray:
    """Subject mask, found relative to the modal background value.

    Thresholding on an absolute value is fragile: a colour management change
    moves the gray and the whole frame reads as ink. The background is by far
    the most common value in these renders, so key off that instead.
    """
    image = np.asarray(Image.open(path).convert("L"), dtype=np.int16)
    background = int(np.bincount(image.ravel(), minlength=256).argmax())
    return np.abs(image - background) > 24


def basic(mask: np.ndarray) -> dict:
    h, w = mask.shape
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return {"empty": True}
    y0, y1, x0, x1 = int(ys.min()), int(ys.max()), int(xs.min()), int(xs.max())
    box_h, box_w = y1 - y0 + 1, x1 - x0 + 1
    row_widths = []
    for row in range(y0, y1 + 1):
        cols = np.where(mask[row])[0]
        if len(cols):
            row_widths.append(int(cols.max() - cols.min() + 1))
    median_width = float(np.median(row_widths)) if row_widths else 0.0
    return {
        "empty": False,
        "frame": [w, h],
        "bbox": [x0, y0, x1, y1],
        "fill_h": round(box_h / h * 100.0, 2),
        "fill_w": round(box_w / w * 100.0, 2),
        "ink": round(float(mask.mean()) * 100.0, 2),
        "solidity": round(float(mask.sum()) / max(1, box_h * box_w) * 100.0, 2),
        "aspect_w_over_h": round(box_w / max(1, box_h), 4),
        "median_row_width": median_width,
        "ribbon_score": round(median_width / max(1, box_h), 4),
    }


def mobile_ceiling(aspect_w_over_h: float) -> dict:
    """Tallest a subject of this projected aspect can be in a portrait frame."""
    out = {}
    for name, (w, h) in PORTRAIT_FRAMES.items():
        if aspect_w_over_h <= 0:
            out[name] = None
            continue
        max_height_px = min(h, w / aspect_w_over_h)
        out[name] = round(max_height_px / h * 100.0, 2)
    return out


def outline_lobes(mask: np.ndarray, min_prominence: float = 0.045) -> int:
    """Count radial maxima of the outline: a proxy for separated primaries."""
    ys, xs = np.where(mask)
    if len(ys) < 50:
        return 0
    cy, cx = ys.mean(), xs.mean()
    bins = 180
    radius = np.zeros(bins)
    ang = (np.arctan2(ys - cy, xs - cx) + math.pi) / (2 * math.pi) * bins
    idx = np.minimum(bins - 1, ang.astype(int))
    dist = np.hypot(ys - cy, xs - cx)
    for i, d in zip(idx, dist):
        if d > radius[i]:
            radius[i] = d
    scale = radius.max() or 1.0
    r = radius / scale
    # Smooth once so pixel noise does not count as a feather.
    kernel = np.array([0.25, 0.5, 0.25])
    r = np.convolve(np.concatenate([r[-2:], r, r[:2]]), kernel, mode="same")[2:-2]
    count = 0
    for i in range(bins):
        prev, cur, nxt = r[(i - 1) % bins], r[i], r[(i + 1) % bins]
        if cur > prev and cur >= nxt:
            left = cur - min(r[(i - k) % bins] for k in range(1, 7))
            right = cur - min(r[(i + k) % bins] for k in range(1, 7))
            if min(left, right) > min_prominence:
                count += 1
    return count


def feather_profile(mask: np.ndarray) -> dict:
    """Does the close-up read as quill + vane + tip rather than a cone or spike?

    Projects the mask onto its principal axis and looks at the width profile:
    a feather is narrow at the calamus, widest in the vane belly, and tapers to
    a point. A cone is monotonic. A shard is thin throughout.
    """
    ys, xs = np.where(mask)
    if len(ys) < 200:
        return {"readable": False, "reason": "empty"}
    pts = np.stack([xs, ys], axis=1).astype(np.float64)
    pts -= pts.mean(axis=0)
    _u, _s, vt = np.linalg.svd(pts, full_matrices=False)
    axis = vt[0]
    perp = np.array([-axis[1], axis[0]])
    along = pts @ axis
    across = pts @ perp
    bins = 24
    lo, hi = along.min(), along.max()
    length = hi - lo
    if length < 20:
        return {"readable": False, "reason": "too small"}
    widths = []
    for b in range(bins):
        sel = (along >= lo + b * length / bins) & (along < lo + (b + 1) * length / bins)
        widths.append(float(across[sel].max() - across[sel].min()) if sel.sum() > 4 else 0.0)
    widths = np.array(widths)
    peak = float(widths.max()) or 1.0
    norm = widths / peak
    peak_at = int(np.argmax(widths)) / (bins - 1)
    # Orient so the thin end (calamus) is at index 0.
    if norm[:4].mean() > norm[-4:].mean():
        norm = norm[::-1]
        peak_at = 1.0 - peak_at
    stalk = float(norm[:3].mean())
    tip = float(norm[-3:].mean())
    belly = float(norm.max())
    slenderness = round(float(length / peak), 3)
    readable = bool(stalk < 0.42 and tip < 0.40 and belly > 0.85 and 2.0 < slenderness < 12.0 and 0.18 < peak_at < 0.85)
    return {
        "readable": readable,
        "stalk_width_ratio": round(stalk, 3),
        "tip_width_ratio": round(tip, 3),
        "belly_at": round(peak_at, 3),
        "slenderness": slenderness,
        "width_profile": [round(float(v), 3) for v in norm],
        "reason": "" if readable else "profile is not quill -> vane belly -> tapered tip",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", required=True)
    args = parser.parse_args()

    with open(os.path.join(args.dir, "render.json"), encoding="utf-8") as handle:
        render = json.load(handle)

    metrics: dict[str, dict] = {}
    for name, info in render["views"].items():
        path = os.path.join(args.dir, info["file"])
        if not os.path.exists(path):
            metrics[name] = {"empty": True, "reason": "missing file"}
            continue
        mask = mask_of(path)
        entry = basic(mask)
        entry.update({"view": info["view"], "frame_name": name})
        if name in ("front-34", "side-34", "profile", "flight", "wings"):
            entry["mobile_ceiling"] = mobile_ceiling(entry.get("aspect_w_over_h", 0.0))
        if name in ("wings", "front-34", "side-34", "tail"):
            entry["lobes"] = outline_lobes(mask)
        if name == "hero-feather":
            entry["feather_profile"] = feather_profile(mask)
        metrics[name] = entry

    out = {"asset": render.get("asset"), "views": metrics}
    with open(os.path.join(args.dir, "metrics.json"), "w", encoding="utf-8") as handle:
        json.dump(out, handle, indent=2)

    for name, entry in metrics.items():
        if entry.get("empty"):
            print(f"{name:14} EMPTY")
            continue
        extra = ""
        if "ribbon_score" in entry:
            extra += f" ribbon={entry['ribbon_score']:.3f}"
        if "lobes" in entry:
            extra += f" lobes={entry['lobes']}"
        if "feather_profile" in entry:
            extra += f" feather_readable={entry['feather_profile']['readable']}"
        print(f"{name:14} fillH={entry['fill_h']:5.1f}% fillW={entry['fill_w']:5.1f}% solidity={entry['solidity']:5.1f}%{extra}")


if __name__ == "__main__":
    main()
