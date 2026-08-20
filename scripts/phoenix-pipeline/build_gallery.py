"""Build the public QA gallery for a candidate Phoenix asset.

  python3 build_gallery.py --dir RUN_DIR [--label name]

Writes index.html next to the renders so the directory can be deployed as-is.
Required paths at the gallery root: /front-34.png /side-34.png /flight.png
/wings.png /390.png /430.png /head.png /hero-feather.png /tail.png
"""

from __future__ import annotations

import argparse
import html
import json
import os

REQUIRED = [
    ("front-34.png", "front 3/4", "1440"),
    ("side-34.png", "side 3/4", "1440"),
    ("flight.png", "flight", "1440"),
    ("wings.png", "wings spread", "1440"),
    ("390.png", "390 front 3/4", "390"),
    ("430.png", "430 front 3/4", "430"),
    ("head.png", "head", "close-up"),
    ("hero-feather.png", "hero feather", "close-up"),
    ("tail.png", "tail", "close-up"),
]
EXTRA = [
    ("profile.png", "90 degree profile", "evidence"),
    ("390-flight.png", "390 flight", "390"),
    ("390-wings.png", "390 wings", "390"),
    ("430-flight.png", "430 flight", "430"),
]

CSS = """
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin:0; background:#0e0f11; color:#e8e6e1; padding:48px 28px 96px;
  font:15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif; }
.wrap { max-width:1180px; margin:0 auto; }
h1 { font-size:30px; letter-spacing:-0.02em; margin:0 0 6px; font-weight:600; }
h2 { font-size:19px; margin:52px 0 4px; font-weight:600; letter-spacing:-0.01em; }
p.sub { color:#9b9791; margin:0 0 8px; max-width:80ch; }
.status { margin:24px 0 0; padding:18px 20px; border-radius:12px; border:1px solid #2c2f33; background:#16181b; }
.status.pass { border-color:#2f6b45; background:#101d15; }
.status.fail { border-color:#6b2b2b; background:#1d1113; }
.status.wait { border-color:#6b5a2b; background:#1d1a11; }
.status b { font-size:17px; }
table { width:100%; border-collapse:collapse; margin-top:14px; font-size:14px; }
th, td { text-align:left; padding:8px 10px; border-bottom:1px solid #232528; vertical-align:top; }
th { color:#9b9791; font-weight:500; }
.pass { color:#7ddc9a; } .fail { color:#ff8f8f; } .wait { color:#f0c674; }
.grid { display:grid; gap:22px; grid-template-columns:repeat(auto-fill, minmax(330px,1fr)); margin-top:18px; }
figure { margin:0; background:#16181b; border:1px solid #232528; border-radius:12px; overflow:hidden; }
figure img { display:block; width:100%; height:auto; background:#7a7a7a; }
figcaption { padding:10px 12px; font-size:13px; color:#b6b2ac; display:flex; justify-content:space-between; gap:10px; }
figcaption b { color:#e8e6e1; font-weight:500; }
code { background:#1c1e21; padding:2px 6px; border-radius:5px; font-size:13px; }
dl { display:grid; grid-template-columns:220px 1fr; gap:4px 16px; font-size:14px; margin:14px 0 0; }
dt { color:#9b9791; } dd { margin:0; }
a { color:#9dc8ff; }
"""


def fig(directory: str, filename: str, label: str, tag: str, metrics: dict) -> str:
    if not os.path.exists(os.path.join(directory, filename)):
        return ""
    key = filename[:-4]
    entry = metrics.get("views", {}).get(key, {})
    note = tag
    if entry and not entry.get("empty") and tag != "close-up":
        note = f"fillH {entry['fill_h']}% · fillW {entry['fill_w']}%"
    return (
        f'<figure><img src="{filename}" alt="{html.escape(label)}" loading="lazy" />'
        f"<figcaption><b>{html.escape(label)}</b><span>{html.escape(note)}</span></figcaption></figure>"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", required=True)
    parser.add_argument("--label", default="candidate")
    args = parser.parse_args()
    d = args.dir

    def load(name: str) -> dict:
        path = os.path.join(d, name)
        if not os.path.exists(path):
            return {}
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    validation = load("validation.json")
    metrics = load("metrics.json")
    gate = load("gate.json")

    status = gate.get("status", "UNKNOWN")
    cls = "pass" if status == "PASS" else ("wait" if status.startswith("INCOMPLETE") else "fail")

    rows = []
    for c in gate.get("checks", []):
        mark = {True: '<span class="pass">PASS</span>', False: '<span class="fail">FAIL</span>', None: '<span class="wait">UNVERIFIED</span>'}[c["ok"]]
        rows.append(
            f"<tr><td>{html.escape(c['name'])}</td><td>{c['kind']}</td><td>{mark}</td>"
            f"<td>{html.escape(str(c['detail']))}</td></tr>"
        )

    counts = validation.get("counts", {})
    inventory = validation.get("inventory", {})
    struct = validation.get("structure", {})
    bbox = validation.get("bbox", {})
    facts = {
        "asset": validation.get("file", {}).get("name", "—"),
        "sha256": (validation.get("file", {}).get("sha256") or "")[:16] or "—",
        "vertices": counts.get("vertices", "—"),
        "triangles": counts.get("triangles", "—"),
        "mesh objects": inventory.get("mesh_objects", "—"),
        "materials": inventory.get("materials", "—"),
        "textures": inventory.get("images", "—"),
        "animations": inventory.get("animations", "—"),
        "mesh islands": validation.get("islands", {}).get("count", "—"),
        "floating islands": validation.get("islands", {}).get("floating_count", "—"),
        "dimensions (x,y,z)": ", ".join(str(v) for v in bbox.get("dimensions", [])) or "—",
        "depth / height": struct.get("depth_over_height", "—"),
        "torso depth / width": struct.get("torso_depth_over_width", "—"),
        "wing chord depth": struct.get("wing_chord_depth_median", "—"),
        "relief plate": "YES" if validation.get("verdict", {}).get("is_relief_plate") else "no",
    }

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Phoenix asset QA — {html.escape(args.label)}</title>
<style>{CSS}</style></head><body><div class="wrap">
<h1>Phoenix asset QA — {html.escape(args.label)}</h1>
<p class="sub">Matte white, flat Workbench shading, neutral gray background, frozen canonical camera rig.
No glass, transmission, fresnel, bloom, HDRI, cavity, lighting, post-processing, environment or particles.</p>

<div class="status {cls}"><p><b>STATUS: {html.escape(status)}</b> &nbsp; score {gate.get('score', '—')}/100
&nbsp; <span style="color:#9b9791">({html.escape(str(gate.get('score_basis', '')))})</span></p>
<p style="margin:6px 0 0">Glass: <b>{'allowed' if gate.get('glass_allowed') else 'BLOCKED'}</b>.
{('Visual sign-off still missing on ' + str(gate.get('counts', {}).get('unverified', 0)) + ' identity checks; a machine cannot honestly answer those.') if str(status).startswith('INCOMPLETE') else ''}</p>
{''.join(f'<p style="margin:6px 0 0;color:#b6b2ac">{html.escape(n)}</p>' for n in gate.get('notes', []))}
</div>

<h2>Required views</h2>
<div class="grid">{''.join(fig(d, f, l, t, metrics) for f, l, t in REQUIRED)}</div>

<h2>Supporting views</h2>
<div class="grid">{''.join(fig(d, f, l, t, metrics) for f, l, t in EXTRA)}</div>

<h2>Gate</h2>
<table><tr><th>Check</th><th>Kind</th><th>Result</th><th>Detail</th></tr>{''.join(rows)}</table>

<h2>Asset facts</h2>
<dl>{''.join(f'<dt>{html.escape(k)}</dt><dd>{html.escape(str(v))}</dd>' for k, v in facts.items())}</dl>

<p class="sub" style="margin-top:40px">Generated by <code>scripts/phoenix-pipeline/run.sh</code>.
Cameras are frozen in <code>pipeline_common.CANONICAL_VIEWS</code>; assets are rotated into the
canonical frame, never the other way round.</p>
</div></body></html>
"""
    with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as handle:
        handle.write(doc)
    missing = [f for f, _l, _t in REQUIRED if not os.path.exists(os.path.join(d, f))]
    print(f"gallery written: {os.path.join(d, 'index.html')}")
    if missing:
        print("MISSING required renders: " + ", ".join(missing))


if __name__ == "__main__":
    main()
