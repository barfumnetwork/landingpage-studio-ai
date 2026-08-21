"""Strict silhouette gate for a candidate Phoenix asset.

  python3 gate.py --dir RUN_DIR [--visual visual.json] [--label name]

Reads validation.json + metrics.json and writes gate.json.

Two kinds of check:

  measured  decided from geometry or pixels, no opinion involved
  visual    identity questions a machine cannot honestly answer
            (3-second recognition, beak, "both wings belong to one body")

Visual checks start as UNVERIFIED. Status can be FAIL or INCOMPLETE from
measured data alone, but it can never be PASS until every visual check has
been signed off in a visual.json. That is deliberate: it makes score inflation
impossible.
"""

from __future__ import annotations

import argparse
import json
import os

VISUAL_CHECKS = [
    ("recognition", "3-second test says Phoenix"),
    ("front_34", "front 3/4 unmistakable"),
    ("side_34_visual", "side 3/4 unmistakable"),
    ("head", "head unmistakable"),
    ("beak", "beak unmistakable"),
    ("neck", "neck unmistakable"),
    ("chest", "chest has visible side volume"),
    ("torso", "torso has visible side volume"),
    ("shoulder", "shoulder readable"),
    ("wing_left", "left wing readable"),
    ("wing_right", "right wing readable"),
    ("wings_same_body", "both wings belong to the same body"),
    ("primaries", "primaries readable as separate feathers"),
    ("no_plate_look", "no serrated plate look, no shard look"),
    ("tail_feathers", "tail reads as feathers, not strips"),
    ("hero_feather_visual", "hero feather reads as shaft + vane + tip"),
]


def check(name: str, kind: str, ok: bool | None, detail: str, weight: int = 1) -> dict:
    return {"name": name, "kind": kind, "ok": ok, "detail": detail, "weight": weight}


def evaluate(validation: dict, metrics: dict, visual: dict) -> dict:
    views = metrics.get("views", {})
    struct = validation.get("structure", {})
    counts = validation.get("counts", {})
    islands = validation.get("islands", {})
    slab = validation.get("slab_profile", {})
    verdict = validation.get("verdict", {})

    def view(name: str) -> dict:
        return views.get(name, {})

    checks: list[dict] = []

    tris = counts.get("triangles", 0)
    checks.append(
        check(
            "triangle budget",
            "measured",
            50_000 <= tris <= 400_000,
            f"{tris} triangles (hero target 50,000-150,000+)",
        )
    )
    areas = validation.get("projected_areas", {})
    thickness = validation.get("local_thickness", {})
    wing_planes = validation.get("wing_planes", {})
    checks.append(
        check(
            "volumetric body, not a relief plate",
            "measured",
            not verdict.get("is_relief_plate", True),
            f"torso local thickness {thickness.get('torso_thickness_over_width')} of torso width "
            f"(need >=0.30), side/front area {areas.get('side_over_front')}, depth/height "
            f"{struct.get('depth_over_height')}"
            + ("; " + "; ".join(verdict.get("relief_plate_reasons", [])) if verdict.get("relief_plate_reasons") else ""),
            weight=3,
        )
    )
    normal_dot = wing_planes.get("max_normal_dot_depth", 1.0)
    checks.append(
        check(
            "wing chord runs front to back",
            "measured",
            normal_dot <= 0.70,
            f"wing plate normal points {normal_dot} along the depth axis (need <=0.70, else the "
            f"wings lie in the picture plane and go edge-on); wing local thickness "
            f"{thickness.get('wings', {}).get('median')}",
            weight=2,
        )
    )
    checks.append(
        check(
            "no floating geometry",
            "measured",
            islands.get("floating_count", 1) == 0,
            f"{islands.get('count')} islands forming {islands.get('components')} connected "
            f"assembly component(s) at tolerance {islands.get('connect_tolerance')}; "
            f"{islands.get('floating_count')} float free",
        )
    )

    for name, label in (("front-34", "front 3/4"), ("side-34", "side 3/4"), ("flight", "flight"), ("wings", "wings spread")):
        entry = view(name)
        fill = entry.get("fill_h", 0.0)
        checks.append(
            check(
                f"1440 {label} framing",
                "measured",
                55.0 <= fill <= 72.0 and not entry.get("empty", True),
                f"fill_h {fill}% (target 55-70%)",
            )
        )

    # "Is the side view a ribbon" is answered on geometry, not on the pixel
    # ribbon score. That score is median mask width over bounding box height,
    # which measures how slim the POSE is: it ranked the rejected relief emblem
    # (0.305, squat and wide) above a genuinely volumetric bird in a tall rising
    # pose (0.193). Area kept from the side is pose independent, and for a
    # bilaterally symmetric solid it approximates mean depth over mean width,
    # so 0.45 is the boundary between "depth comparable to width" and "plate".
    side_area = areas.get("side_over_front", 0.0)
    checks.append(
        check(
            "side view keeps real silhouette area",
            "measured",
            side_area >= 0.45,
            f"side/front projected area {side_area} (need >=0.45; the rejected emblem scores 0.354)",
            weight=3,
        )
    )
    for name, label in (("side-34", "side 3/4"), ("profile", "90 degree profile")):
        checks.append(
            check(
                f"{label} pixel ribbon score",
                "advisory",
                None,
                f"median mask width / height {view(name).get('ribbon_score', 0.0)}; confounded by pose "
                "slimness, so it informs the eye and does not decide the gate",
                weight=0,
            )
        )

    for frame in ("390", "430"):
        entry = view(frame)
        fill = entry.get("fill_h", 0.0)
        checks.append(
            check(
                f"{frame} height 55-70%",
                "measured",
                55.0 <= fill <= 70.0,
                f"fill_h {fill}%",
                weight=2,
            )
        )
    front = view("front-34")
    ceiling = (front.get("mobile_ceiling") or {}).get("390")
    if ceiling is not None:
        checks.append(
            check(
                "mobile framing is geometrically reachable",
                "measured",
                ceiling >= 60.0,
                f"widest-possible 390 height for this pose is {ceiling}% (need >=60% for headroom)",
                weight=2,
            )
        )

    feather = view("hero-feather").get("feather_profile", {})
    checks.append(
        check(
            "hero feather profile (quill / vane / tip)",
            "measured",
            bool(feather.get("readable")),
            f"stalk {feather.get('stalk_width_ratio')} , belly at {feather.get('belly_at')} , "
            f"tip {feather.get('tip_width_ratio')} , slenderness {feather.get('slenderness')}"
            + (f" — {feather.get('reason')}" if feather.get("reason") else ""),
            weight=2,
        )
    )
    # Outline lobe counts resolve gross masses (wings, tail, head), not
    # individual feathers, so they inform the eye rather than decide the gate.
    checks.append(
        check(
            "outline lobes, tail close-up",
            "advisory",
            None,
            f"{view('tail').get('lobes', 0)} gross lobes; feather separation is a visual call",
            weight=0,
        )
    )
    checks.append(
        check(
            "outline lobes, wings view",
            "advisory",
            None,
            f"{view('wings').get('lobes', 0)} gross lobes; primary separation is a visual call",
            weight=0,
        )
    )
    checks.append(
        check(
            "silhouette solidity",
            "advisory",
            None,
            "front 3/4 " + str(view("front-34").get("solidity")) + "%, side 3/4 "
            + str(view("side-34").get("solidity")) + "% ink inside the bounding box",
            weight=0,
        )
    )

    for key, label in VISUAL_CHECKS:
        raw = visual.get(key)
        ok = None if raw is None else bool(raw is True or str(raw).lower() in ("pass", "true", "yes"))
        checks.append(check(label, "visual", ok, "signed off" if ok else ("UNVERIFIED" if ok is None else "rejected on inspection")))

    measured = [c for c in checks if c["kind"] == "measured"]
    visual_checks = [c for c in checks if c["kind"] == "visual"]
    failed = [c for c in checks if c["ok"] is False and c["kind"] != "advisory"]
    unverified = [c for c in visual_checks if c["ok"] is None]

    scored = [c for c in checks if c["weight"] > 0]
    total_weight = sum(c["weight"] for c in scored)
    earned = sum(c["weight"] for c in scored if c["ok"] is True)
    score = int(round(earned / max(1, total_weight) * 100))

    if failed:
        status = "FAIL"
    elif unverified:
        status = "INCOMPLETE — awaiting visual sign-off"
    else:
        status = "PASS"

    return {
        "status": status,
        "score": score,
        "score_basis": f"{earned}/{total_weight} weighted checks",
        "counts": {
            "measured_total": len(measured),
            "measured_passed": len([c for c in measured if c["ok"] is True]),
            "visual_total": len(visual_checks),
            "visual_signed_off": len([c for c in visual_checks if c["ok"] is True]),
            "failed": len(failed),
            "unverified": len(unverified),
        },
        "glass_allowed": status == "PASS",
        "checks": checks,
        "notes": verdict.get("notes", []),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", required=True)
    parser.add_argument("--visual", default=None)
    parser.add_argument("--label", default="candidate")
    args = parser.parse_args()

    with open(os.path.join(args.dir, "validation.json"), encoding="utf-8") as handle:
        validation = json.load(handle)
    with open(os.path.join(args.dir, "metrics.json"), encoding="utf-8") as handle:
        metrics = json.load(handle)
    visual: dict = {}
    if args.visual and os.path.exists(args.visual):
        with open(args.visual, encoding="utf-8") as handle:
            visual = json.load(handle)

    result = evaluate(validation, metrics, visual)
    result["label"] = args.label
    result["asset"] = validation.get("file", {}).get("name")
    with open(os.path.join(args.dir, "gate.json"), "w", encoding="utf-8") as handle:
        json.dump(result, handle, indent=2)

    print(f"STATUS {result['status']}   SCORE {result['score']}/100   ({result['score_basis']})")
    for c in result["checks"]:
        mark = {True: "PASS", False: "FAIL", None: "info" if c["kind"] == "advisory" else "----"}[c["ok"]]
        print(f"  [{mark}] {c['name']}  —  {c['detail']}")
    if result["status"] != "PASS":
        print("\nGLASS: blocked. Silhouette gate not cleared.")


if __name__ == "__main__":
    main()
