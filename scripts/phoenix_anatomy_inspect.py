"""Forensic inspection of the uploaded phoenix GLB. Read-only. No new creature."""

from __future__ import annotations

import collections
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

GLB = "/tmp/phoenix-acquire/New_Project_2082026.glb"
OUT = "/tmp/phoenix-asset"
os.makedirs(OUT, exist_ok=True)


def import_clean() -> bpy.types.Object:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=GLB)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "Phoenix"
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.mesh.remove_doubles(threshold=0.0002)
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()
    return obj


def island_stats(obj: bpy.types.Object) -> list[dict]:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    islands = []
    for chunk in bmesh.ops.split_by_islands(bm, faces=bm.faces) if False else []:
        pass
    visited = set()
    for v in bm.verts:
        if v.index in visited:
            continue
        stack = [v]
        visited.add(v.index)
        idxs = [v.index]
        while stack:
            cur = stack.pop()
            for e in cur.link_edges:
                oth = e.other_vert(cur)
                if oth.index not in visited:
                    visited.add(oth.index)
                    stack.append(oth)
                    idxs.append(oth.index)
        pts = [bm.verts[i].co.copy() for i in idxs]
        xs = [p.x for p in pts]
        ys = [p.y for p in pts]
        zs = [p.z for p in pts]
        islands.append(
            {
                "verts": len(idxs),
                "xmin": min(xs),
                "xmax": max(xs),
                "ymin": min(ys),
                "ymax": max(ys),
                "zmin": min(zs),
                "zmax": max(zs),
                "cx": sum(xs) / len(xs),
                "cy": sum(ys) / len(ys),
                "cz": sum(zs) / len(zs),
            }
        )
    bm.free()
    islands.sort(key=lambda d: -d["verts"])
    return islands


def thickness_along_y(obj: bpy.types.Object, samples: int = 1800) -> dict[str, list[float]]:
    mesh = obj.data
    n = len(mesh.vertices)
    tree = KDTree(n)
    for i, v in enumerate(mesh.vertices):
        tree.insert(v.co, i)
    tree.balance()

    buckets: dict[str, list[float]] = collections.defaultdict(list)
    dims = obj.dimensions
    for i, v in enumerate(mesh.vertices):
        if i % max(1, n // samples) != 0:
            continue
        p = v.co
        # region labels in object space
        nx = (p.x + dims.x * 0.5) / max(1e-6, dims.x)
        nz = (p.z + dims.z * 0.5) / max(1e-6, dims.z)
        ny = abs(p.y) / max(1e-6, dims.y * 0.5)
        if nz > 0.72 and abs(p.x) < dims.x * 0.22:
            region = "head"
        elif nz > 0.58 and abs(p.x) < dims.x * 0.18:
            region = "neck"
        elif 0.42 < nz < 0.72 and abs(p.x) < dims.x * 0.18:
            region = "chest"
        elif 0.30 < nz < 0.55 and abs(p.x) < dims.x * 0.16:
            region = "body"
        elif nz < 0.32 and abs(p.x) < dims.x * 0.28:
            region = "tail"
        elif abs(p.x) > dims.x * 0.22:
            region = "wing"
        else:
            region = "other"
        # local thickness: nearest vertex on opposite Y
        target = Vector((p.x, -p.y, p.z))
        _co, _idx, dist = tree.find(target)
        # also span of nearby verts in Y at this xz
        nearby = [co.y for co, _, d in tree.find_range(Vector((p.x, 0.0, p.z)), 0.06)]
        span = (max(nearby) - min(nearby)) if nearby else dist
        buckets[region].append(span)
        buckets["_all"].append(span)
    return buckets


def y_span_grid(obj: bpy.types.Object, nx: int = 12, nz: int = 12) -> None:
    xs = [v.co.x for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    xmin, xmax = min(xs), max(xs)
    zmin, zmax = min(zs), max(zs)
    cells: dict[tuple[int, int], list[float]] = collections.defaultdict(list)
    for v in obj.data.vertices:
        ix = min(nx - 1, int((v.co.x - xmin) / max(1e-9, xmax - xmin) * nx))
        iz = min(nz - 1, int((v.co.z - zmin) / max(1e-9, zmax - zmin) * nz))
        cells[(ix, iz)].append(v.co.y)
    print("Y-SPAN GRID (cols=X left->right, rows=Z bottom->top)", file=sys.stderr)
    for iz in range(nz - 1, -1, -1):
        row = []
        for ix in range(nx):
            ys = cells.get((ix, iz), [])
            if not ys:
                row.append("  . ")
            else:
                span = max(ys) - min(ys)
                row.append(f"{span:4.2f}")
        print(" ".join(row), file=sys.stderr)


def main() -> None:
    obj = import_clean()
    mesh = obj.data
    print(f"faces={len(mesh.polygons)} verts={len(mesh.vertices)} dim={tuple(round(x, 4) for x in obj.dimensions)}", file=sys.stderr)
    bb = [Vector(c) for c in obj.bound_box]
    print(f"bbox min={[round(min(c[i] for c in bb), 4) for i in range(3)]} max={[round(max(c[i] for c in bb), 4) for i in range(3)]}", file=sys.stderr)

    islands = island_stats(obj)
    print(f"islands={len(islands)}", file=sys.stderr)
    for i, isl in enumerate(islands[:20]):
        print(
            f"  island[{i}] verts={isl['verts']} "
            f"x=[{isl['xmin']:.3f},{isl['xmax']:.3f}] "
            f"y=[{isl['ymin']:.3f},{isl['ymax']:.3f}] "
            f"z=[{isl['zmin']:.3f},{isl['zmax']:.3f}] "
            f"c=({isl['cx']:.3f},{isl['cy']:.3f},{isl['cz']:.3f})",
            file=sys.stderr,
        )

    y_span_grid(obj)
    buckets = thickness_along_y(obj)
    for name, vals in sorted(buckets.items()):
        if not vals:
            continue
        vals = sorted(vals)
        med = vals[len(vals) // 2]
        print(
            f"thickness[{name}] n={len(vals)} med={med:.4f} p10={vals[int(len(vals)*0.1)]:.4f} p90={vals[int(len(vals)*0.9)]:.4f}",
            file=sys.stderr,
        )

    # Extremal verts for anatomy landmarks
    verts = list(mesh.vertices)
    top = max(verts, key=lambda v: v.co.z)
    bot = min(verts, key=lambda v: v.co.z)
    left = min(verts, key=lambda v: v.co.x)
    right = max(verts, key=lambda v: v.co.x)
    front = min(verts, key=lambda v: v.co.y)
    back = max(verts, key=lambda v: v.co.y)
    print(f"top    {tuple(round(x,3) for x in top.co)}", file=sys.stderr)
    print(f"bottom {tuple(round(x,3) for x in bot.co)}", file=sys.stderr)
    print(f"xmin   {tuple(round(x,3) for x in left.co)}", file=sys.stderr)
    print(f"xmax   {tuple(round(x,3) for x in right.co)}", file=sys.stderr)
    print(f"ymin   {tuple(round(x,3) for x in front.co)}", file=sys.stderr)
    print(f"ymax   {tuple(round(x,3) for x in back.co)}", file=sys.stderr)


if __name__ == "__main__":
    main()
