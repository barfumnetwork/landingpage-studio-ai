"""Matte white silhouette renderer for candidate Phoenix assets.

Run inside Blender:
  blender --background --python render_silhouettes.py -- \
      --glb IN.glb --out DIR [--orient -y] [--up z] [--landmarks landmarks.json]

Writes the gate filenames: front-34, side-34, profile, flight, wings, 390,
390-flight, 390-wings, 430, 430-flight, head, hero-feather, tail.

Read-only on the source asset. Matte white on neutral gray, flat shading, no
lighting, no cavity, no glass, no post-processing. The camera rig is frozen in
pipeline_common.CANONICAL_VIEWS.
"""

from __future__ import annotations

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline_common import (  # noqa: E402
    CANONICAL_VIEWS,
    FRAMES,
    WHITE,
    argv_after_dashes,
    normalize_orientation,
    parse_args,
    setup_matte_scene,
)


def load(glb: str, orient: str, up: str) -> bpy.types.Object:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_matte_scene()
    bpy.ops.import_scene.gltf(filepath=glb)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("no mesh objects in GLB")
    normalize_orientation(meshes, orient, up)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "Candidate"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)
    mat = bpy.data.materials.new("MatteWhite")
    mat.diffuse_color = WHITE
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    bpy.context.view_layer.update()
    return obj


def coords(obj: bpy.types.Object) -> np.ndarray:
    co = np.empty(len(obj.data.vertices) * 3, dtype=np.float64)
    obj.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def detect_landmarks(obj: bpy.types.Object) -> dict:
    """Head, hero primary tip and tail centre, in the canonical frame."""
    pts = coords(obj)
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    height = float(z.max() - z.min())
    span = float(x.max() - x.min())
    spine_x = float(np.median(x))

    upper = pts[z > z.max() - 0.30 * height]
    near_spine = upper[np.abs(upper[:, 0] - spine_x) < 0.16 * span]
    head = near_spine if len(near_spine) > 50 else upper
    head_c = head.mean(axis=0)
    head_r = max(0.10 * height, float(np.percentile(np.linalg.norm(head - head_c, axis=1), 70)))

    lower = pts[z < z.min() + 0.34 * height]
    tail_c = lower.mean(axis=0) if len(lower) else np.array([spine_x, 0.0, z.min()])
    tail_r = max(0.16 * height, float(np.percentile(np.linalg.norm(lower - tail_c, axis=1), 80))) if len(lower) else 0.3

    body_c = np.array([spine_x, float(np.median(y)), float(np.median(z))])
    wing = pts[(np.abs(pts[:, 0] - spine_x) > 0.30 * span * 0.5) & (pts[:, 2] > np.percentile(z, 40))]
    if len(wing):
        far = wing[np.argmax(np.linalg.norm(wing - body_c, axis=1))]
    else:
        far = pts[np.argmax(np.linalg.norm(pts - body_c, axis=1))]
    feather_r = 0.14 * height

    return {
        "head": {"center": [float(v) for v in head_c], "radius": float(head_r)},
        "hero_feather": {"center": [float(v) for v in far], "radius": float(feather_r)},
        "tail": {"center": [float(v) for v in tail_c], "radius": float(tail_r)},
        "body_center": [float(v) for v in body_c],
    }


def ndc_bounds(cam, obj, keep=None):
    from bpy_extras.object_utils import world_to_camera_view

    scene = bpy.context.scene
    mat = obj.matrix_world
    xs: list[float] = []
    ys: list[float] = []
    for vert in obj.data.vertices:
        co = vert.co
        if keep is not None and not keep(co):
            continue
        ndc = world_to_camera_view(scene, cam, mat @ co)
        xs.append(ndc.x)
        ys.append(ndc.y)
    if not xs:
        return 0.0, 1.0, 0.0, 1.0
    return min(xs), max(xs), min(ys), max(ys)


def look_at(cam, target: Vector, location: Vector) -> None:
    cam.location = location
    cam.rotation_euler = (target - location).normalized().to_track_quat("-Z", "Y").to_euler()


def recenter(cam, obj, center: Vector, keep=None) -> None:
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
    cx, cy = (x0 + x1) * 0.5, (y0 + y1) * 0.5
    dist = (cam.location - center).length
    v_fov = cam.data.angle_y if cam.data.sensor_fit == "VERTICAL" else cam.data.angle
    scene = bpy.context.scene
    aspect = scene.render.resolution_x / max(1, scene.render.resolution_y)
    h_fov = 2 * math.atan(math.tan(v_fov * 0.5) * aspect)
    quat = cam.matrix_world.to_quaternion()
    cam.location += (quat @ Vector((1.0, 0.0, 0.0))) * ((cx - 0.5) * 2.0 * math.tan(h_fov * 0.5) * dist)
    cam.location += (quat @ Vector((0.0, 1.0, 0.0))) * ((cy - 0.5) * 2.0 * math.tan(v_fov * 0.5) * dist)
    bpy.context.view_layer.update()


def fit(cam, obj, direction: Vector, target_fill: float, center: Vector, keep=None, lens: float = 50.0) -> float:
    """Binary search the camera distance for a target height fill with margins."""
    cam.data.lens = lens
    cam.data.sensor_width = 36.0
    cam.data.clip_start = 0.005
    cam.data.clip_end = 200.0
    direction = direction.normalized()
    lo, hi, best = 0.05, 60.0, 4.0
    margin = 0.04
    for _ in range(30):
        mid = (lo + hi) * 0.5
        look_at(cam, center, center + direction * mid)
        bpy.context.view_layer.update()
        x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
        overflow = x0 < margin or x1 > 1.0 - margin or y0 < margin or y1 > 1.0 - margin
        height = y1 - y0
        best = mid
        if overflow:
            lo = mid
        elif height > target_fill + 0.02:
            lo = mid
        elif height < target_fill - 0.02:
            hi = mid
        else:
            break
    look_at(cam, center, center + direction * best)
    recenter(cam, obj, center, keep)
    return best


def main() -> None:
    args = parse_args(argv_after_dashes())
    glb = args["glb"]
    out = args.get("out", "/tmp/phoenix-render")
    os.makedirs(out, exist_ok=True)

    obj = load(glb, args.get("orient", "-y"), args.get("up", "z"))
    landmarks = detect_landmarks(obj)
    override = args.get("landmarks")
    if override and os.path.exists(override):
        with open(override, encoding="utf-8") as handle:
            landmarks.update(json.load(handle))
        print(f"landmarks overridden from {override}", file=sys.stderr)

    cam_data = bpy.data.cameras.new("GateCam")
    cam = bpy.data.objects.new("GateCam", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    body_center = Vector(landmarks["body_center"])
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    bbox_center = sum(corners, Vector()) / 8.0

    def sphere(entry: dict):
        center = Vector(entry["center"])
        radius = float(entry["radius"])
        return center, (lambda p, c=center, r=radius: (p - c).length < r)

    head_c, head_keep = sphere(landmarks["head"])
    hero_c, hero_keep = sphere(landmarks["hero_feather"])
    tail_c, tail_keep = sphere(landmarks["tail"])

    jobs: list[tuple[str, str, str, float, object, Vector, float]] = [
        ("front-34", "front-34", "1440", 0.64, None, bbox_center, 50.0),
        ("side-34", "side-34", "1440", 0.64, None, bbox_center, 50.0),
        ("profile", "profile", "1440", 0.64, None, bbox_center, 50.0),
        ("flight", "flight", "1440", 0.64, None, bbox_center, 50.0),
        ("wings", "wings", "1440", 0.62, None, bbox_center, 50.0),
        ("390", "front-34", "390", 0.62, None, bbox_center, 50.0),
        ("390-flight", "flight", "390", 0.62, None, bbox_center, 50.0),
        ("390-wings", "wings", "390", 0.60, None, bbox_center, 50.0),
        ("430", "front-34", "430", 0.62, None, bbox_center, 50.0),
        ("430-flight", "flight", "430", 0.62, None, bbox_center, 50.0),
        # Close-ups crop the canonical rig, they never invent a camera. Each
        # landmark is cropped from the canonical direction that shows it: a beak
        # pointing at the front camera is foreshortened to nothing, so the head
        # and tail are read from side 3/4. Every image records its view below.
        ("head", "side-34", "1440", 0.72, head_keep, head_c, 85.0),
        ("hero-feather", "front-34", "1440", 0.74, hero_keep, hero_c, 85.0),
        ("tail", "side-34", "1440", 0.70, tail_keep, tail_c, 85.0),
    ]

    manifest: dict[str, dict] = {}
    for name, view, frame, target, keep, center, lens in jobs:
        width, height = FRAMES[frame]
        scene = bpy.context.scene
        scene.render.resolution_x = width
        scene.render.resolution_y = height
        direction = Vector(CANONICAL_VIEWS[view])
        dist = fit(cam, obj, direction, target, center, keep, lens)
        x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
        path = os.path.join(out, f"{name}.png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        manifest[name] = {
            "file": f"{name}.png",
            "view": view,
            "frame": [width, height],
            "camera_direction": list(CANONICAL_VIEWS[view]),
            "distance": round(dist, 4),
            "ndc_width": round(x1 - x0, 4),
            "ndc_height": round(y1 - y0, 4),
            "cropped": keep is not None,
        }
        print(f"rendered {name} ndcH={y1-y0:.3f} ndcW={x1-x0:.3f}", file=sys.stderr)

    with open(os.path.join(out, "render.json"), "w", encoding="utf-8") as handle:
        json.dump({"asset": os.path.basename(glb), "landmarks": landmarks, "views": manifest}, handle, indent=2)
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
