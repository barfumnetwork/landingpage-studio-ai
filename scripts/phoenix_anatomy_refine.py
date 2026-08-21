"""Phase 14F: refine the uploaded phoenix GLB. No new creature. No glass.

v2: weld islands (no wire cones), Y-scale the torso, twist wings off edge-on,
fan a few physical primaries with gaps so matte white can read feathers.
"""

from __future__ import annotations

import math
import os
import sys

import bmesh
import bpy
from mathutils import Quaternion, Vector
from mathutils.kdtree import KDTree
from bpy_extras.object_utils import world_to_camera_view

GLB = "/tmp/phoenix-acquire/New_Project_2082026.glb"
OUT = "/tmp/phoenix-asset"
os.makedirs(OUT, exist_ok=True)

WHITE = (0.957, 0.957, 0.957, 1.0)
GRAY = (0.478, 0.478, 0.478, 1.0)

# Filled by refine_mesh so the feather close-up frames one primary.
HERO_FEATHER: dict[str, Vector] = {}


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = WHITE[:3]
    scene.display.shading.show_shadows = False
    scene.display.shading.show_specular_highlight = False
    scene.display.shading.show_cavity = False
    scene.display.shading.background_type = "WORLD"
    scene.display.render_aa = "FXAA"
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new("SilhouetteWorld")
    world.use_nodes = False
    world.color = GRAY[:3]
    scene.world = world


def import_and_clean() -> bpy.types.Object:
    bpy.ops.import_scene.gltf(filepath=GLB)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise RuntimeError("no mesh in GLB")
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


def _smooth01(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _ellip(p: Vector, c: Vector, r: Vector) -> float:
    q = Vector(((p.x - c.x) / r.x, (p.y - c.y) / r.y, (p.z - c.z) / r.z))
    return _smooth01(1.0 - min(1.0, q.length))


def vertex_islands(obj: bpy.types.Object) -> list[list[int]]:
    mesh = obj.data
    adj: list[list[int]] = [[] for _ in range(len(mesh.vertices))]
    for edge in mesh.edges:
        a, b = edge.vertices
        adj[a].append(b)
        adj[b].append(a)
    seen = [False] * len(mesh.vertices)
    islands: list[list[int]] = []
    for i in range(len(mesh.vertices)):
        if seen[i]:
            continue
        stack = [i]
        seen[i] = True
        chunk = [i]
        while stack:
            cur = stack.pop()
            for nxt in adj[cur]:
                if not seen[nxt]:
                    seen[nxt] = True
                    stack.append(nxt)
                    chunk.append(nxt)
        islands.append(chunk)
    islands.sort(key=len, reverse=True)
    return islands


def append_cone(mesh: bpy.types.Mesh, base: Vector, tip: Vector, r1: float, r2: float, segments: int = 8) -> None:
    direction = tip - base
    length = direction.length
    if length < 1e-4:
        return
    bm = bmesh.new()
    bm.from_mesh(mesh)
    geom = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=segments,
        radius1=r1,
        radius2=r2,
        depth=length,
    )
    quat = Vector((0.0, 0.0, 1.0)).rotation_difference(direction.normalized())
    mid = (base + tip) * 0.5
    for vert in geom["verts"]:
        vert.co = quat @ vert.co + mid
    bm.to_mesh(mesh)
    bm.free()


def append_feather(mesh: bpy.types.Mesh, quill: Vector, tip: Vector, vane_normal: Vector, width: float) -> None:
    """Physical feather: thick rachis + asymmetric vane slab. Gaps between fans must remain."""
    axis = tip - quill
    length = axis.length
    if length < 0.05:
        return
    direction = axis.normalized()
    normal = vane_normal.normalized()
    if abs(normal.dot(direction)) > 0.85:
        normal = Vector((0.0, 1.0, 0.0))
        if abs(normal.dot(direction)) > 0.85:
            normal = Vector((1.0, 0.0, 0.0))
    normal = (normal - direction * normal.dot(direction)).normalized()
    width_dir = direction.cross(normal).normalized()
    # Quill extends behind the vane so shaft reads in a matte silhouette.
    rachis_base = quill - direction * (length * 0.18)
    append_cone(mesh, rachis_base, tip, max(0.010, width * 0.22), max(0.003, width * 0.07), segments=10)

    bm = bmesh.new()
    bm.from_mesh(mesh)
    geom = bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=14,
        radius1=width * 0.50,
        radius2=0.0015,
        depth=length * 0.90,
    )
    quat = Vector((0.0, 0.0, 1.0)).rotation_difference(direction)
    vane_origin = quill + direction * (length * 0.47)
    for vert in geom["verts"]:
        local = quat @ vert.co
        thick = local.dot(normal)
        wide = local.dot(width_dir)
        along = local.dot(direction)
        lead = 0.48 if wide < 0.0 else 1.0
        wide *= lead
        # Physical vane thickness — not a paper sheet.
        thick *= 0.38
        vert.co = vane_origin + width_dir * wide + normal * thick + direction * along
    bm.to_mesh(mesh)
    bm.free()


def weld_islands(obj: bpy.types.Object, islands: list[list[int]]) -> int:
    """Pull stray islands onto the main body. No wire braces."""
    if len(islands) < 2:
        return 0
    mesh = obj.data
    main = islands[0]
    tree = KDTree(len(main))
    for i, idx in enumerate(main):
        tree.insert(mesh.vertices[idx].co, idx)
    tree.balance()
    moved = 0
    for chunk in islands[1:]:
        best_d = 1e9
        best_a = mesh.vertices[chunk[0]].co.copy()
        best_b = best_a
        step = max(1, len(chunk) // 400)
        for idx in chunk[::step]:
            co, _other, dist = tree.find(mesh.vertices[idx].co)
            if dist < best_d:
                best_d = dist
                best_a = mesh.vertices[idx].co.copy()
                best_b = Vector(co)
        if best_d < 0.01:
            continue
        # Overlap the island into the body; keep most of the plume length.
        pull = 0.92 if len(chunk) < 200 else 0.62
        delta = (best_b - best_a) * pull
        for idx in chunk:
            mesh.vertices[idx].co += delta
        moved += 1
        if best_d * (1.0 - pull) > 0.05:
            root = best_b
            end = best_a + delta
            radius = 0.032 if len(chunk) > 400 else 0.018
            append_cone(mesh, root, end, radius, radius * 0.6, segments=10)
    mesh.update()
    return moved


def rotate_region(mesh: bpy.types.Mesh, pred, origin: Vector, axis: Vector, degrees: float) -> int:
    if axis.length < 1e-6:
        return 0
    q = Quaternion(axis.normalized(), math.radians(degrees))
    n = 0
    for v in mesh.vertices:
        if pred(v.co):
            v.co = origin + q @ (v.co - origin)
            n += 1
    return n


def fan_hero_feathers(mesh: bpy.types.Mesh) -> list[tuple[Vector, Vector]]:
    """A few fanned primaries + tail plumes, anchored on the live mesh."""
    placed: list[tuple[Vector, Vector]] = []

    def centroid(pred) -> Vector:
        pts = [v.co.copy() for v in mesh.vertices if pred(v.co)]
        if not pts:
            return Vector()
        return sum(pts, Vector()) / len(pts)

    def extreme(pred, origin: Vector) -> Vector:
        best = origin
        best_d = 0.0
        for v in mesh.vertices:
            if not pred(v.co):
                continue
            d = (v.co - origin).length
            if d > best_d:
                best_d = d
                best = v.co.copy()
        return best

    shoulder_l = centroid(lambda p: -0.28 < p.x < -0.02 and 0.05 < p.z < 0.35)
    tip_l = extreme(lambda p: p.x < -0.35 and p.z > 0.15, shoulder_l)
    wing_dir = (tip_l - shoulder_l)
    if wing_dir.length < 0.15:
        wing_dir = Vector((-0.7, 0.25, 0.55))
    wing_dir.normalize()
    fan_axis = Vector((0.10, 0.96, 0.18)).normalized()
    for i in range(5):
        ang = -20.0 + i * 10.5
        direction = Quaternion(fan_axis, math.radians(ang)) @ wing_dir
        length = 0.28 + i * 0.016
        quill = shoulder_l + direction * max(0.40, (tip_l - shoulder_l).length * 0.55)
        tip = quill + direction * length
        vane_n = Vector((0.05, 1.0, 0.12)).normalized()
        append_feather(mesh, quill, tip, vane_n, 0.050 if i < 3 else 0.044)
        placed.append((quill, tip))
        if i == 3:
            HERO_FEATHER["quill"] = quill.copy()
            HERO_FEATHER["tip"] = tip.copy()
            HERO_FEATHER["mid"] = (quill + tip) * 0.5

    shoulder_r = centroid(lambda p: 0.18 < p.x < 0.45 and -0.22 < p.z < 0.08)
    tip_r = extreme(lambda p: p.x > 0.45 and p.z < 0.05, shoulder_r)
    wing_r = (tip_r - shoulder_r)
    if wing_r.length < 0.12:
        wing_r = Vector((0.7, -0.1, -0.4))
    wing_r.normalize()
    for i in range(3):
        ang = -8.0 + i * 11.0
        direction = Quaternion(Vector((0.1, 0.95, 0.2)), math.radians(ang)) @ wing_r
        quill = shoulder_r + direction * 0.38
        tip = quill + direction * (0.22 + i * 0.018)
        append_feather(mesh, quill, tip, Vector((0.1, 0.95, 0.1)), 0.042)
        placed.append((quill, tip))

    tail_root = centroid(lambda p: abs(p.x) < 0.35 and p.z < -0.28)
    tail_tip = extreme(lambda p: p.z < -0.45, tail_root)
    tail_dir = (tail_tip - tail_root)
    if tail_dir.length < 0.12:
        tail_dir = Vector((0.28, 0.04, -0.82))
    tail_dir.normalize()
    for i in range(4):
        ang = -14.0 + i * 10.0
        direction = Quaternion(Vector((0.12, 0.98, 0.0)), math.radians(ang)) @ tail_dir
        quill = tail_root + direction * 0.03
        tip = quill + direction * (0.34 + (i % 2) * 0.04)
        append_feather(mesh, quill, tip, Vector((0.15, 0.95, 0.1)), 0.036)
        placed.append((quill, tip))
    return placed


def refine_mesh(obj: bpy.types.Object) -> dict[str, float]:
    mesh = obj.data
    mesh.update()

    body_c = Vector((0.18, -0.10, -0.16))
    chest_c = Vector((0.10, -0.20, 0.02))
    neck_c = Vector((0.06, -0.15, 0.30))
    head_c = Vector((0.00, -0.15, 0.54))
    l_sh = Vector((-0.12, 0.04, 0.20))
    r_sh = Vector((0.34, -0.08, -0.04))
    tail_c = Vector((0.20, -0.05, -0.42))
    body_y = -0.10

    weights = []
    for v in mesh.vertices:
        p = v.co
        body = _ellip(p, body_c, Vector((0.28, 0.22, 0.32)))
        chest = _ellip(p, chest_c, Vector((0.22, 0.22, 0.22)))
        neck = _ellip(p, neck_c, Vector((0.14, 0.14, 0.20)))
        head = _ellip(p, head_c, Vector((0.12, 0.12, 0.15)))
        lsh = _ellip(p, l_sh, Vector((0.18, 0.18, 0.18)))
        rsh = _ellip(p, r_sh, Vector((0.18, 0.18, 0.18)))
        tail = _ellip(p, tail_c, Vector((0.22, 0.16, 0.22)))
        beak_guard = 0.2 if (head > 0.3 and (p - head_c).length > 0.10) else 1.0
        core = (
            0.85 * chest
            + 0.65 * body
            + 0.55 * lsh
            + 0.55 * rsh
            + 0.45 * neck
            + 0.50 * tail
            + 0.16 * head * beak_guard
        )
        weights.append(min(1.0, core))

    # Direct Y-scale of the torso. Normals alone cannot beat an edge-on wing.
    for i, v in enumerate(mesh.vertices):
        w = weights[i]
        if w < 0.04:
            continue
        v.co.y = body_y + (v.co.y - body_y) * (1.0 + 1.85 * w)
        side = 1.0 if (v.co.y - body_y) >= 0.0 else -1.0
        if abs(v.normal.y) > 0.15:
            side = 1.0 if v.normal.y >= 0.0 else -1.0
        v.co.y += side * 0.070 * w
        chest = _ellip(v.co, chest_c, Vector((0.22, 0.22, 0.22)))
        v.co.y -= 0.055 * chest

    mesh.update()

    # Open the pose in Y: left wing toward +Y, right wing toward -Y.
    # Side 3/4 cannot gain width unless dim_y actually grows.
    left_n = 0
    right_n = 0
    l_sh = Vector((-0.10, 0.06, 0.18))
    r_sh = Vector((0.28, -0.06, -0.04))
    for v in mesh.vertices:
        p = v.co
        if p.x < -0.16 and p.z > 0.00:
            t = min(1.0, (l_sh - p).length / 0.95)
            v.co.y += 0.22 * t * t
            left_n += 1
        elif p.x > 0.26 and p.z < 0.14:
            t = min(1.0, (r_sh - p).length / 0.85)
            v.co.y -= 0.16 * t * t
            right_n += 1
    mesh.update()

    rotate_region(
        mesh,
        lambda p: p.x < -0.18 and p.z > 0.02,
        Vector((-0.10, 0.12, 0.18)),
        Vector((-0.75, 0.20, 0.55)),
        18.0,
    )
    rotate_region(
        mesh,
        lambda p: p.x > 0.28 and p.z < 0.12,
        Vector((0.28, -0.10, -0.04)),
        Vector((0.70, -0.12, -0.40)),
        -14.0,
    )
    mesh.update()

    # Light smooth on flesh only.
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    core_verts = [bm.verts[i] for i, w in enumerate(weights) if w > 0.22 and i < len(bm.verts)]
    if core_verts:
        bmesh.ops.smooth_vert(bm, verts=core_verts, factor=0.22, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    islands = vertex_islands(obj)
    welded = weld_islands(obj, islands)
    mesh = obj.data
    mesh.update()

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    mesh = obj.data

    # Hero feathers AFTER origin reset so close-up keep() matches world coords.
    feathers = fan_hero_feathers(mesh)
    mesh.update()

    ys = [v.co.y for v in obj.data.vertices]
    print(f"y_extent=[{min(ys):.3f},{max(ys):.3f}] span={max(ys)-min(ys):.3f}", file=sys.stderr)

    return {
        "islands_before": float(len(islands)),
        "welded": float(welded),
        "hero_feathers": float(len(feathers)),
        "left_wing_twist_verts": float(left_n),
        "right_wing_twist_verts": float(right_n),
        "faces": float(len(mesh.polygons)),
        "verts": float(len(mesh.vertices)),
        "dim_x": obj.dimensions.x,
        "dim_y": obj.dimensions.y,
        "dim_z": obj.dimensions.z,
    }


def apply_matte(obj: bpy.types.Object) -> None:
    mat = bpy.data.materials.new("MatteWhite")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfDiffuse")
    bsdf.inputs["Color"].default_value = WHITE
    bsdf.inputs["Roughness"].default_value = 1.0
    mat.node_tree.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mat.diffuse_color = WHITE
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def ndc_bounds(cam: bpy.types.Object, obj: bpy.types.Object, keep=None) -> tuple[float, float, float, float]:
    scene = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    xs: list[float] = []
    ys: list[float] = []
    mat = evaluated.matrix_world
    for vert in mesh.vertices:
        if callable(keep) and not keep(vert.co):
            continue
        ndc = world_to_camera_view(scene, cam, mat @ vert.co)
        xs.append(ndc.x)
        ys.append(ndc.y)
    evaluated.to_mesh_clear()
    if not xs:
        return 0.0, 1.0, 0.0, 1.0
    return min(xs), max(xs), min(ys), max(ys)


def look_at(cam: bpy.types.Object, target: Vector, location: Vector) -> None:
    cam.location = location
    direction = target - location
    cam.rotation_euler = direction.normalized().to_track_quat("-Z", "Y").to_euler()


def center_camera(cam: bpy.types.Object, obj: bpy.types.Object, keep=None) -> None:
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
    cx, cy = (x0 + x1) * 0.5, (y0 + y1) * 0.5
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
    center = sum(corners, Vector()) / 8.0
    dist = (cam.location - center).length
    v_fov = cam.data.angle
    aspect = bpy.context.scene.render.resolution_x / max(1, bpy.context.scene.render.resolution_y)
    h_fov = 2 * math.atan(math.tan(v_fov * 0.5) * aspect)
    right = cam.matrix_world.to_quaternion() @ Vector((1.0, 0.0, 0.0))
    up = cam.matrix_world.to_quaternion() @ Vector((0.0, 1.0, 0.0))
    cam.location += right * ((cx - 0.5) * 2.0 * math.tan(h_fov * 0.5) * dist)
    cam.location += up * ((cy - 0.5) * 2.0 * math.tan(v_fov * 0.5) * dist)
    bpy.context.view_layer.update()


def fit_camera(cam: bpy.types.Object, obj: bpy.types.Object, direction: Vector, fill: float, keep=None) -> None:
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    if callable(keep):
        pts = [v.co for v in obj.data.vertices if keep(v.co)]
        center = sum(pts, Vector()) / max(1, len(pts)) if pts else Vector()
    else:
        corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
        center = sum(corners, Vector()) / 8.0
    direction = direction.normalized()
    cam.data.lens = 50 if keep is None else 90
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.01
    cam.data.clip_end = 80.0
    lo, hi = 0.12, 40.0
    best = 4.0
    for _ in range(24):
        mid = (lo + hi) * 0.5
        look_at(cam, center, center + direction * mid)
        bpy.context.view_layer.update()
        x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
        margin = 0.06 if keep is None else 0.08
        overflow = x0 < margin or x1 > 1.0 - margin or y0 < margin or y1 > 1.0 - margin
        height = y1 - y0
        if overflow:
            lo = mid
            best = mid
        elif height > fill + 0.03:
            lo = mid
            best = mid
        elif height < fill - 0.02:
            hi = mid
            best = mid
        else:
            best = mid
            break
    look_at(cam, center, center + direction * best)
    center_camera(cam, obj, keep)
    bpy.context.scene.camera = cam
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
    print(
        f"cam dist={best:.2f} ndcW={x1 - x0:.3f} ndcH={y1 - y0:.3f} "
        f"x=[{x0:.3f},{x1:.3f}] y=[{y0:.3f},{y1:.3f}]",
        file=sys.stderr,
    )


def render_views(obj: bpy.types.Object) -> None:
    data = bpy.data.cameras.new("SilhouetteCam")
    cam = bpy.data.objects.new("SilhouetteCam", data)
    bpy.context.collection.objects.link(cam)

    mid = HERO_FEATHER.get("mid", Vector((-0.70, 0.20, 0.55)))
    quill = HERO_FEATHER.get("quill", mid)
    tip = HERO_FEATHER.get("tip", mid)
    radius = max(0.16, (tip - quill).length * 0.55)

    head_keep = lambda p: (p - Vector((0.02, -0.16, 0.52))).length < 0.24
    feather_keep = lambda p, m=mid, r=radius: (p - m).length < r
    tail_keep = lambda p: p.z < -0.40 and p.x > -0.05

    views = [
        ("front-34", Vector((1.15, -1.80, 0.45)), 0.64, (1440, 900), None),
        ("side-34", Vector((1.90, -0.85, 0.32)), 0.64, (1440, 900), None),
        ("fly-34", Vector((0.95, -1.65, 0.70)), 0.64, (1440, 900), None),
        ("wings", Vector((0.25, -1.10, 1.55)), 0.62, (1440, 900), None),
        ("1440", Vector((1.05, -1.75, 0.50)), 0.64, (1440, 900), None),
        # Portrait 3/4 leans a little more side-on so height can hit the 55% gate
        # without turning the shot into a profile ribbon.
        ("390", Vector((1.45, -1.25, 0.38)), 0.62, (390, 844), None),
        ("390-fly", Vector((1.20, -1.35, 0.62)), 0.62, (390, 844), None),
        ("390-wings", Vector((0.85, -1.40, 0.85)), 0.60, (390, 844), None),
        ("430", Vector((1.45, -1.25, 0.38)), 0.62, (430, 932), None),
        ("430-fly", Vector((1.20, -1.35, 0.62)), 0.62, (430, 932), None),
        ("head", Vector((1.10, -1.45, 0.28)), 0.72, (1440, 900), head_keep),
        ("feather", Vector((0.25, -1.85, 0.35)), 0.80, (1440, 900), feather_keep),
        ("tail", Vector((1.35, -1.25, 0.15)), 0.70, (1440, 900), tail_keep),
    ]
    for name, direction, fill, (w, h), keep in views:
        scene = bpy.context.scene
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        fit_camera(cam, obj, direction, fill, keep)
        scene.render.filepath = os.path.join(OUT, f"sil-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("WROTE", scene.render.filepath, file=sys.stderr)


def main() -> None:
    reset_scene()
    obj = import_and_clean()
    print(
        f"before faces={len(obj.data.polygons)} verts={len(obj.data.vertices)} "
        f"dim={tuple(round(x, 3) for x in obj.dimensions)}",
        file=sys.stderr,
    )
    stats = refine_mesh(obj)
    apply_matte(obj)
    print("REFINE", stats, file=sys.stderr)
    print("HERO", {k: tuple(round(x, 3) for x in v) for k, v in HERO_FEATHER.items()}, file=sys.stderr)
    print(
        f"after faces={len(obj.data.polygons)} verts={len(obj.data.vertices)} "
        f"dim={tuple(round(x, 3) for x in obj.dimensions)}",
        file=sys.stderr,
    )

    render_views(obj)

    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, "phoenix-hero.glb"),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="NONE",
    )
    with open(os.path.join(OUT, "stats.txt"), "w", encoding="utf-8") as handle:
        handle.write("source=New_Project_2082026.glb\n")
        handle.write("phase=14F\n")
        for key, value in stats.items():
            handle.write(f"{key}={value}\n")
        handle.write(f"hero_faces={len(obj.data.polygons)}\n")
        handle.write(f"hero_verts={len(obj.data.vertices)}\n")
        handle.write(f"dim={obj.dimensions.x:.4f},{obj.dimensions.y:.4f},{obj.dimensions.z:.4f}\n")
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
