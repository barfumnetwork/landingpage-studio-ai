"""Inspect a candidate Phoenix GLB and report whether it is volumetric.

Run inside Blender:
  blender --background --python validate_asset.py -- --glb IN.glb --out DIR

Read-only: the source file is never written to. Emits validation.json plus a
human readable validation.txt.

The point of this tool is to catch, before any render, the failure mode that
killed Phase 14: a 2.5D relief emblem whose depth axis is a near-uniform plate.
"""

from __future__ import annotations

import hashlib
import json
import os
import statistics
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline_common import (  # noqa: E402
    argv_after_dashes,
    normalize_orientation,
    parse_args,
)


def sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def scene_inventory() -> dict:
    by_type: dict[str, int] = {}
    for obj in bpy.data.objects:
        by_type[obj.type] = by_type.get(obj.type, 0) + 1
    return {
        "objects_by_type": by_type,
        "mesh_objects": by_type.get("MESH", 0),
        "materials": len(bpy.data.materials),
        "images": len(bpy.data.images),
        "animations": len(bpy.data.actions),
        "armatures": len(bpy.data.armatures),
        "shape_keys": len(bpy.data.shape_keys),
        "scenes": len(bpy.data.scenes),
        "collections": len(bpy.data.collections),
    }


def face_stats(objects: list[bpy.types.Object]) -> dict:
    tris = quads = ngons = 0
    triangles = 0
    verts = 0
    for obj in objects:
        mesh = obj.data
        verts += len(mesh.vertices)
        for poly in mesh.polygons:
            n = poly.loop_total
            triangles += max(0, n - 2)
            if n == 3:
                tris += 1
            elif n == 4:
                quads += 1
            else:
                ngons += 1
    return {
        "vertices": verts,
        "triangles": triangles,
        "faces_tri": tris,
        "faces_quad": quads,
        "faces_ngon": ngons,
        "faces_total": tris + quads + ngons,
    }


def world_points(objects: list[bpy.types.Object]) -> np.ndarray:
    chunks = []
    for obj in objects:
        mat = np.array(obj.matrix_world.to_4x4()).reshape(4, 4)
        co = np.empty(len(obj.data.vertices) * 3, dtype=np.float64)
        obj.data.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        homogeneous = np.hstack([co, np.ones((len(co), 1))])
        chunks.append((homogeneous @ mat.T)[:, :3])
    return np.vstack(chunks) if chunks else np.zeros((0, 3))


def mesh_islands(objects: list[bpy.types.Object]) -> list[dict]:
    """Connected components per mesh object, plus the gap to the biggest one."""
    islands: list[dict] = []
    for obj in objects:
        mesh = obj.data
        n = len(mesh.vertices)
        if n == 0:
            continue
        edges = np.empty(len(mesh.edges) * 2, dtype=np.int64)
        mesh.edges.foreach_get("vertices", edges)
        edges = edges.reshape(-1, 2)
        parent = np.arange(n)

        def find(a: int) -> int:
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        for a, b in edges:
            ra, rb = find(int(a)), find(int(b))
            if ra != rb:
                parent[rb] = ra
        roots = np.array([find(i) for i in range(n)])
        co = np.empty(n * 3, dtype=np.float64)
        mesh.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        mat = np.array(obj.matrix_world.to_4x4()).reshape(4, 4)
        co = (np.hstack([co, np.ones((n, 1))]) @ mat.T)[:, :3]
        for root in np.unique(roots):
            sel = roots == root
            islands.append(
                {
                    "object": obj.name,
                    "vertices": int(sel.sum()),
                    "centroid": [round(float(x), 4) for x in co[sel].mean(axis=0)],
                    "_points": co[sel],
                }
            )
    islands.sort(key=lambda d: -d["vertices"])
    return islands


def island_connectivity(islands: list[dict], tolerance: float) -> dict:
    """Is the assembly one connected whole, or is something floating in space?

    A hero asset is legitimately built from interpenetrating parts (body, wing
    arms, one solid per feather), so requiring a single welded shell would be
    wrong. What must not happen is a part sitting in mid-air. So link islands
    that touch or overlap and check the link graph is a single component.
    """
    from mathutils.kdtree import KDTree

    samples: list[np.ndarray] = []
    owner: list[int] = []
    for i, isl in enumerate(islands):
        pts = isl["_points"]
        step = max(1, len(pts) // 700)
        taken = pts[::step]
        samples.append(taken)
        owner.extend([i] * len(taken))
    if not samples:
        return {"components": 0, "floating": []}
    cloud = np.vstack(samples)
    tree = KDTree(len(cloud))
    for idx, point in enumerate(cloud):
        tree.insert(Vector((float(point[0]), float(point[1]), float(point[2]))), idx)
    tree.balance()

    parent = list(range(len(islands)))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    nearest_other = [float("inf")] * len(islands)
    for idx, point in enumerate(cloud):
        mine = owner[idx]
        for _co, other_idx, dist in tree.find_range(
            Vector((float(point[0]), float(point[1]), float(point[2]))), tolerance
        ):
            theirs = owner[other_idx]
            if theirs == mine:
                continue
            nearest_other[mine] = min(nearest_other[mine], dist)
            ra, rb = find(mine), find(theirs)
            if ra != rb:
                parent[rb] = ra

    groups: dict[int, list[int]] = {}
    for i in range(len(islands)):
        groups.setdefault(find(i), []).append(i)
    ranked = sorted(groups.values(), key=lambda g: -sum(islands[i]["vertices"] for i in g))
    main = set(ranked[0]) if ranked else set()
    floating = []
    for i, isl in enumerate(islands):
        isl["nearest_other_island"] = None if nearest_other[i] == float("inf") else round(nearest_other[i], 5)
        if i not in main:
            floating.append(
                {
                    "object": isl["object"],
                    "vertices": isl["vertices"],
                    "centroid": isl["centroid"],
                    "nearest_other_island": isl["nearest_other_island"],
                }
            )
    return {
        "tolerance": round(tolerance, 5),
        "components": len(groups),
        "main_component_islands": len(main),
        "floating": floating,
    }


def principal_extents(points: np.ndarray) -> dict:
    centered = points - points.mean(axis=0)
    cov = np.cov(centered.T)
    values, vectors = np.linalg.eigh(cov)
    order = np.argsort(values)[::-1]
    vectors = vectors[:, order]
    projected = centered @ vectors
    extents = projected.max(axis=0) - projected.min(axis=0)
    return {
        "extents": [round(float(x), 4) for x in extents],
        "flatness": round(float(extents[2] / max(1e-9, extents[0])), 4),
        "axes": [[round(float(v), 4) for v in vectors[:, i]] for i in range(3)],
    }


def slab_profile(points: np.ndarray, bands: int = 26) -> dict:
    """Slice along up (Z) and compare depth (Y) against width (X) per slice.

    A sculpted body has depth comparable to width over the torso. A relief
    emblem has a near constant, tiny depth everywhere.
    """
    z = points[:, 2]
    zmin, zmax = float(z.min()), float(z.max())
    step = (zmax - zmin) / bands
    ratios: list[float] = []
    depths: list[float] = []
    per_band: list[dict] = []
    for b in range(bands):
        lo = zmin + b * step
        sel = points[(z >= lo) & (z < lo + step)]
        if len(sel) < 40:
            continue
        depth = float(np.percentile(sel[:, 1], 97) - np.percentile(sel[:, 1], 3))
        width = float(np.percentile(sel[:, 0], 97) - np.percentile(sel[:, 0], 3))
        if width < 1e-6:
            continue
        ratios.append(depth / width)
        depths.append(depth)
        per_band.append(
            {
                "z": round(lo + step * 0.5, 4),
                "depth": round(depth, 4),
                "width": round(width, 4),
                "ratio": round(depth / width, 4),
            }
        )
    return {
        "bands": per_band,
        "depth_over_width_median": round(statistics.median(ratios), 4) if ratios else 0.0,
        "depth_over_width_p90": round(float(np.percentile(ratios, 90)), 4) if ratios else 0.0,
        "depth_median": round(statistics.median(depths), 4) if depths else 0.0,
    }


def projected_areas(points: np.ndarray, cells: int = 220) -> dict:
    """Rasterise the point cloud from front, side and top with one cell size.

    The strongest emblem test there is: a sculpted creature keeps a substantial
    share of its front area when seen from the side, a relief plate does not.
    """
    lo = points.min(axis=0)
    hi = points.max(axis=0)
    cell = float((hi - lo).max()) / cells
    if cell <= 0:
        return {}
    grid = np.floor((points - lo) / cell).astype(np.int64)

    def occupied(a: int, b: int) -> int:
        pairs = np.unique(grid[:, [a, b]], axis=0)
        return len(pairs)

    front = occupied(0, 2)  # X-Z, the authored view
    side = occupied(1, 2)  # Y-Z
    top = occupied(0, 1)  # X-Y
    return {
        "cell": round(cell, 5),
        "front_cells": front,
        "side_cells": side,
        "top_cells": top,
        "side_over_front": round(side / max(1, front), 4),
        "top_over_front": round(top / max(1, front), 4),
    }


def local_thickness(points: np.ndarray, cells: int = 60) -> dict:
    """Per-cell depth of the surface, not the spread between separate surfaces.

    This is the metric Phase 14 was missing. A relief emblem can report a
    healthy global depth just because a wing root sits in front of a tail
    plume, while every individual point of the body is a 5 cm plate. Bucket the
    front view into cells and measure the Y span inside each cell instead.
    """
    x, y, z = points[:, 0], points[:, 1], points[:, 2]
    height = float(z.max() - z.min())
    span = float(x.max() - x.min())
    cell = height / cells
    if cell <= 0:
        return {}
    keys = np.stack([np.floor(x / cell).astype(np.int64), np.floor(z / cell).astype(np.int64)], axis=1)
    order = np.lexsort((keys[:, 1], keys[:, 0]))
    keys_sorted = keys[order]
    y_sorted = y[order]
    boundaries = np.any(np.diff(keys_sorted, axis=0) != 0, axis=1)
    starts = np.concatenate([[0], np.where(boundaries)[0] + 1])
    ends = np.concatenate([np.where(boundaries)[0] + 1, [len(y_sorted)]])

    spine_x = float(np.median(x))
    z_lo = float(np.percentile(z, 32))
    z_hi = float(np.percentile(z, 72))

    all_spans: list[float] = []
    torso_spans: list[float] = []
    wing_spans: list[float] = []
    for s, e in zip(starts, ends):
        if e - s < 6:
            continue
        span_y = float(y_sorted[s:e].max() - y_sorted[s:e].min())
        cx = (keys_sorted[s, 0] + 0.5) * cell
        cz = (keys_sorted[s, 1] + 0.5) * cell
        all_spans.append(span_y)
        if abs(cx - spine_x) < 0.16 * span and z_lo <= cz <= z_hi:
            torso_spans.append(span_y)
        elif abs(cx - spine_x) > 0.34 * span * 0.5:
            wing_spans.append(span_y)

    torso_width = float(np.percentile(points[np.abs(x - spine_x) < 0.16 * span][:, 0], 97) - np.percentile(points[np.abs(x - spine_x) < 0.16 * span][:, 0], 3)) if len(points) else 0.0

    def stats(values: list[float]) -> dict:
        if not values:
            return {"median": 0.0, "p90": 0.0, "cells": 0}
        return {
            "median": round(float(np.median(values)), 4),
            "p90": round(float(np.percentile(values, 90)), 4),
            "cells": len(values),
        }

    torso = stats(torso_spans)
    return {
        "cell": round(cell, 4),
        "all": stats(all_spans),
        "torso": torso,
        "wings": stats(wing_spans),
        "torso_thickness_over_width": round(torso["median"] / max(1e-9, torso_width), 4),
        "torso_width": round(torso_width, 4),
    }


def wing_planes(points: np.ndarray) -> dict:
    """Which way does each wing surface face?

    A real spread wing is a broad surface whose chord runs front to back, so its
    plate normal points roughly up. An emblem wing lies in the picture plane, so
    its normal points at the camera and the wing vanishes in any side view.
    """
    x = points[:, 0]
    spine_x = float(np.median(x))
    half_span = float(x.max() - x.min()) * 0.5
    out: dict[str, dict] = {}
    for label, sel in (
        ("left", points[(x - spine_x) < -0.34 * half_span],),
        ("right", points[(x - spine_x) > 0.34 * half_span],),
    ):
        if len(sel) < 200:
            out[label] = {"points": int(len(sel))}
            continue
        sample = sel[:: max(1, len(sel) // 20000)]
        centered = sample - sample.mean(axis=0)
        values, vectors = np.linalg.eigh(np.cov(centered.T))
        normal = vectors[:, int(np.argmin(values))]
        extents = (centered @ vectors).max(axis=0) - (centered @ vectors).min(axis=0)
        out[label] = {
            "points": int(len(sel)),
            "plate_normal": [round(float(v), 4) for v in normal],
            "normal_dot_depth": round(abs(float(normal[1])), 4),
            "normal_dot_up": round(abs(float(normal[2])), 4),
            "thinnest_extent": round(float(np.min(extents)), 4),
        }
    depth_facing = [v.get("normal_dot_depth", 0.0) for v in out.values() if "normal_dot_depth" in v]
    out["max_normal_dot_depth"] = round(max(depth_facing), 4) if depth_facing else 0.0
    return out


def structure(points: np.ndarray) -> dict:
    """Approximate body / wings / tail measurements on a Z-up, -Y facing asset."""
    x, y, z = points[:, 0], points[:, 1], points[:, 2]
    span = float(x.max() - x.min())
    height = float(z.max() - z.min())
    depth = float(y.max() - y.min())
    half_span = span * 0.5
    spine_x = float(np.median(x))

    core = points[np.abs(x - spine_x) < 0.16 * span]
    torso = core
    if len(core) > 200:
        z_lo = np.percentile(core[:, 2], 30)
        z_hi = np.percentile(core[:, 2], 72)
        torso = core[(core[:, 2] >= z_lo) & (core[:, 2] <= z_hi)]
    torso_depth = float(np.percentile(torso[:, 1], 97) - np.percentile(torso[:, 1], 3)) if len(torso) > 50 else 0.0
    torso_width = float(np.percentile(torso[:, 0], 97) - np.percentile(torso[:, 0], 3)) if len(torso) > 50 else 0.0

    wing = points[np.abs(x - spine_x) > 0.34 * half_span]
    chord_ratios: list[float] = []
    if len(wing) > 200:
        bins = 12
        wx = wing[:, 0]
        edges = np.linspace(wx.min(), wx.max(), bins + 1)
        for i in range(bins):
            sel = wing[(wx >= edges[i]) & (wx < edges[i + 1])]
            if len(sel) < 40:
                continue
            chord = float(np.percentile(sel[:, 1], 97) - np.percentile(sel[:, 1], 3))
            chord_ratios.append(chord / max(1e-9, half_span))
    tail = points[z < z.min() + 0.30 * height]
    tail_depth = float(np.percentile(tail[:, 1], 97) - np.percentile(tail[:, 1], 3)) if len(tail) > 50 else 0.0

    head = points[z > z.max() - 0.18 * height]
    head_depth = float(np.percentile(head[:, 1], 97) - np.percentile(head[:, 1], 3)) if len(head) > 50 else 0.0

    return {
        "wingspan_x": round(span, 4),
        "height_z": round(height, 4),
        "depth_y": round(depth, 4),
        "depth_over_height": round(depth / max(1e-9, height), 4),
        "torso_depth": round(torso_depth, 4),
        "torso_width": round(torso_width, 4),
        "torso_depth_over_width": round(torso_depth / max(1e-9, torso_width), 4),
        "wing_chord_depth_median": round(statistics.median(chord_ratios), 4) if chord_ratios else 0.0,
        "wing_chord_depth_max": round(max(chord_ratios), 4) if chord_ratios else 0.0,
        "tail_depth": round(tail_depth, 4),
        "head_depth": round(head_depth, 4),
    }


def main() -> None:
    args = parse_args(argv_after_dashes())
    glb = args["glb"]
    out = args.get("out", "/tmp/phoenix-validate")
    os.makedirs(out, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("no mesh objects in GLB")

    inventory = scene_inventory()
    faces = face_stats(meshes)
    normalize_orientation(meshes, args.get("orient", "-y"), args.get("up", "z"))
    bpy.context.view_layer.update()

    points = world_points(meshes)
    bbox_min = [round(float(v), 4) for v in points.min(axis=0)]
    bbox_max = [round(float(v), 4) for v in points.max(axis=0)]
    dims = [round(float(b - a), 4) for a, b in zip(bbox_min, bbox_max)]

    islands = mesh_islands(meshes)
    diag = float(np.linalg.norm(np.array(bbox_max) - np.array(bbox_min)))
    connectivity = island_connectivity(islands, 0.005 * diag)
    for isl in islands:
        isl.pop("_points", None)
    floating = connectivity["floating"]

    pca = principal_extents(points[:: max(1, len(points) // 40000)])
    slab = slab_profile(points)
    struct = structure(points)
    areas = projected_areas(points)
    thickness = local_thickness(points)
    wings = wing_planes(points)

    plate_reasons = []
    torso_ratio = thickness.get("torso_thickness_over_width", 0.0)
    if torso_ratio < 0.30:
        plate_reasons.append(
            f"torso local thickness is {torso_ratio} of torso width (a ribcage is >=0.30); "
            "the body is a plate, not a mass"
        )
    if areas.get("side_over_front", 1.0) < 0.25:
        plate_reasons.append(f"side view keeps only {areas.get('side_over_front')} of the front silhouette area")
    if struct["depth_over_height"] < 0.25:
        plate_reasons.append(f"depth/height {struct['depth_over_height']} < 0.25")
    plate = bool(plate_reasons)

    wings_face_camera = wings.get("max_normal_dot_depth", 0.0) > 0.70

    report = {
        "file": {
            "path": glb,
            "name": os.path.basename(glb),
            "bytes": os.path.getsize(glb),
            "sha256": sha256(glb),
        },
        "orientation": {"faces": args.get("orient", "-y"), "up": args.get("up", "z")},
        "inventory": inventory,
        "counts": faces,
        "bbox": {"min": bbox_min, "max": bbox_max, "dimensions": dims, "diagonal": round(diag, 4)},
        "islands": {
            "count": len(islands),
            "largest_vertices": islands[0]["vertices"] if islands else 0,
            "components": connectivity["components"],
            "connect_tolerance": connectivity["tolerance"],
            "floating_count": len(floating),
            "floating": floating[:20],
            "top": islands[:12],
        },
        "pca": pca,
        "slab_profile": slab,
        "projected_areas": areas,
        "local_thickness": thickness,
        "wing_planes": wings,
        "structure": struct,
        "verdict": {
            "is_relief_plate": plate,
            "relief_plate_reasons": plate_reasons,
            "wings_lie_in_picture_plane": bool(wings_face_camera),
            "triangles_in_target": bool(50_000 <= faces["triangles"] <= 400_000),
            "notes": [],
        },
    }
    notes = report["verdict"]["notes"]
    if plate:
        notes.append(
            "Relief plate detected — side views will read as a ribbon regardless of camera "
            "or material: " + "; ".join(plate_reasons)
        )
    if faces["triangles"] < 50_000:
        notes.append(f"Only {faces['triangles']} triangles; hero target is 50,000-150,000+.")
    if wings_face_camera:
        notes.append(
            f"Wing surfaces lie in the picture plane (plate normal dot depth "
            f"{wings.get('max_normal_dot_depth')} > 0.70): both wings will vanish edge on in any side view."
        )
    if floating:
        notes.append(
            f"{len(floating)} island(s) float free: they are not linked to the main assembly "
            f"within {connectivity['tolerance']} units."
        )
    if inventory["animations"]:
        notes.append(f"{inventory['animations']} animation action(s) present.")

    with open(os.path.join(out, "validation.json"), "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    lines = [
        "PHOENIX ASSET VALIDATION",
        f"file            {report['file']['name']}  ({report['file']['bytes']} bytes)",
        f"sha256          {report['file']['sha256']}",
        f"mesh objects    {inventory['mesh_objects']}",
        f"vertices        {faces['vertices']}",
        f"triangles       {faces['triangles']}",
        f"faces           {faces['faces_total']} (tri {faces['faces_tri']} / quad {faces['faces_quad']} / ngon {faces['faces_ngon']})",
        f"materials       {inventory['materials']}",
        f"textures        {inventory['images']}",
        f"animations      {inventory['animations']}",
        f"armatures       {inventory['armatures']}",
        f"dimensions      x={dims[0]} y={dims[1]} z={dims[2]}",
        f"bbox            {bbox_min} -> {bbox_max}",
        f"islands         {len(islands)} in {connectivity['components']} component(s), floating {len(floating)}",
        f"pca extents     {pca['extents']}  flatness={pca['flatness']}",
        f"side/front area {areas.get('side_over_front')}   top/front {areas.get('top_over_front')}",
        f"depth/height    {struct['depth_over_height']}",
        f"torso depth/w   {struct['torso_depth_over_width']} (global spread)",
        f"torso local     thickness={thickness.get('torso', {}).get('median')} "
        f"ratio={thickness.get('torso_thickness_over_width')} (need >=0.30)",
        f"wing local      thickness={thickness.get('wings', {}).get('median')} "
        f"normal.depth={wings.get('max_normal_dot_depth')} (need <=0.70)",
        f"slab depth/w    median={slab['depth_over_width_median']} p90={slab['depth_over_width_p90']}",
        f"relief plate    {'YES' if plate else 'no'}",
        "",
    ]
    lines += [f"note: {n}" for n in notes]
    with open(os.path.join(out, "validation.txt"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print("\n".join(lines), file=sys.stderr)


if __name__ == "__main__":
    main()
