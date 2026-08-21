"""Phase 14G: final silhouette repair on the uploaded phoenix GLB.

Axis probe result (scripts/phoenix_anatomy_inspect.py + ortho renders):
  X = wingspan (left/right), Z = up (head high, tail low),
  Y = chest-to-back depth, and the source is an almost flat slab in Y.
So the side outline width is the Y extent. 14F failed because it grew Y
on the wings too, which kept the body inside the outline.

This pass:
  - starts from the untouched GLB (the 12 Phase 14F cones are gone)
  - rebuilds the torso/neck/head as elliptical cross-sections so the
    profile gains a real ribcage instead of a strip
  - leaves wings, tail and head shape as authored
  - deepens the existing primary notches so tips read as separate feathers
  - adds exactly ONE hero feather with a quill, asymmetric vane and tip

No glass, no shader, no cavity, no camera tricks.
"""

from __future__ import annotations

import math
import os
import statistics
import sys

import bmesh
import bpy
from mathutils import Quaternion, Vector

GLB = "/tmp/phoenix-acquire/New_Project_2082026.glb"
OUT = "/tmp/phoenix-14g"
os.makedirs(OUT, exist_ok=True)

WHITE = (0.957, 0.957, 0.957, 1.0)
GRAY = (0.478, 0.478, 0.478, 1.0)

HERO: dict[str, Vector] = {}


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


def smooth01(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


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


def weld_islands(obj: bpy.types.Object) -> int:
    """Slide stray islands onto the body. No bridging cones."""
    from mathutils.kdtree import KDTree

    mesh = obj.data
    islands = vertex_islands(obj)
    if len(islands) < 2:
        return 0
    main = islands[0]
    tree = KDTree(len(main))
    for idx in main:
        tree.insert(mesh.vertices[idx].co, idx)
    tree.balance()
    moved = 0
    for chunk in islands[1:]:
        best_d = 1e9
        delta = Vector()
        step = max(1, len(chunk) // 500)
        for idx in chunk[::step]:
            co, _i, dist = tree.find(mesh.vertices[idx].co)
            if dist < best_d:
                best_d = dist
                delta = Vector(co) - mesh.vertices[idx].co
        if best_d < 0.008:
            continue
        for idx in chunk:
            mesh.vertices[idx].co += delta
        moved += 1
        print(f"  welded island verts={len(chunk)} gap={best_d:.4f}", file=sys.stderr)
    mesh.update()
    return moved


def body_profile(mesh: bpy.types.Mesh, bins: int = 44):
    """Per-height spine position and body half-width, measured on the mesh."""
    zs = [v.co.z for v in mesh.vertices]
    zmin, zmax = min(zs), max(zs)
    step = (zmax - zmin) / bins
    spine_x: list[float] = []
    spine_y: list[float] = []
    half: list[float] = []
    for b in range(bins):
        z0 = zmin + b * step
        z1 = z0 + step
        near = [v.co for v in mesh.vertices if z0 <= v.co.z < z1 and abs(v.co.x) < 0.46]
        if len(near) < 30:
            spine_x.append(0.0)
            spine_y.append(-0.10)
            half.append(0.0)
            continue
        cx = statistics.median(p.x for p in near)
        core = [p for p in near if abs(p.x - cx) < 0.34]
        if len(core) < 20:
            core = near
        cy = statistics.median(p.y for p in core)
        widths = sorted(abs(p.x - cx) for p in core)
        spine_x.append(cx)
        spine_y.append(cy)
        half.append(widths[int(len(widths) * 0.88)])
    return zmin, step, spine_x, spine_y, half


def barrel_body(mesh: bpy.types.Mesh) -> dict[str, float]:
    """Give the torso, neck and skull elliptical cross-sections in Y.

    The source is a flat plate: every body slice is a thin sheet. Replacing the
    slice thickness with an ellipse is the only way the profile can read as a
    ribcage rather than a strip.
    """
    bins = 44
    zmin, step, spine_x, spine_y, half = body_profile(mesh, bins)
    zs = [v.co.z for v in mesh.vertices]
    zmax = max(zs)

    # Body band: tail root up to the neck base only. The authored head, crest
    # and beak are the one part that already passes, so they stay untouched.
    z_tail = zmin + (zmax - zmin) * 0.34
    z_top = zmin + (zmax - zmin) * 0.66
    z_taper = zmin + (zmax - zmin) * 0.58
    touched = 0
    max_thick = 0.0

    for v in mesh.vertices:
        p = v.co
        if p.z < z_tail or p.z > z_top:
            continue
        b = min(bins - 1, max(0, int((p.z - zmin) / step)))
        r = half[b]
        if r < 0.03:
            continue
        cx = spine_x[b]
        cy = spine_y[b]
        d = abs(p.x - cx)
        if d > r:
            continue
        u = (p.z - z_tail) / max(1e-6, z_top - z_tail)
        # Chest fullest, tail root and neck slimmer.
        depth_ratio = 0.62 + 0.34 * smooth01(1.0 - abs(u - 0.45) / 0.45)
        target = depth_ratio * r * math.sqrt(max(0.0, 1.0 - (d / r) ** 2))
        blend = smooth01((r - d) / max(1e-6, r * 0.42))
        if p.z > z_taper:
            blend *= 1.0 - smooth01((p.z - z_taper) / max(1e-6, z_top - z_taper))
        side = 1.0 if p.y >= cy else -1.0
        current = abs(p.y - cy)
        thick = target * blend + current * (1.0 - blend)
        v.co.y = cy + side * max(thick, current if blend < 0.15 else 0.0)
        touched += 1
        max_thick = max(max_thick, thick)

    mesh.update()
    return {"body_verts": float(touched), "max_half_depth": max_thick, "z_tail": z_tail, "z_top": z_top}


def notch_edges(mesh: bpy.types.Mesh, pred, origin: Vector, lobes: int, depth: float) -> int:
    """Carve negative space between existing outer tips so primaries separate."""
    pts = [(i, v.co) for i, v in enumerate(mesh.vertices) if pred(v.co)]
    if len(pts) < 200:
        return 0
    angles = []
    for _i, p in pts:
        d = p - origin
        angles.append(math.atan2(d.z, d.x))
    a_min, a_max = min(angles), max(angles)
    if a_max - a_min < 0.25:
        return 0
    # Outer radius per angular bin.
    nb = 40
    rmax = [0.0] * nb
    for (i, p), ang in zip(pts, angles):
        b = min(nb - 1, int((ang - a_min) / (a_max - a_min) * nb))
        rmax[b] = max(rmax[b], (p - origin).length)
    moved = 0
    for (i, p), ang in zip(pts, angles):
        r = (p - origin).length
        b = min(nb - 1, int((ang - a_min) / (a_max - a_min) * nb))
        if rmax[b] < 0.2:
            continue
        edge = smooth01((r / rmax[b] - 0.74) / 0.26)
        if edge <= 0.0:
            continue
        phase = (ang - a_min) / (a_max - a_min) * lobes * 2.0 * math.pi
        notch = (1.0 - math.cos(phase)) * 0.5
        pull = depth * edge * notch
        if pull <= 0.0:
            continue
        direction = (p - origin)
        if direction.length < 1e-5:
            continue
        mesh.vertices[i].co = p - direction.normalized() * pull
        moved += 1
    mesh.update()
    return moved


def build_hero_feather(root: Vector, direction: Vector, length: float, width: float) -> bpy.types.Object:
    """One real feather: bare calamus, asymmetric vane, barbed trailing edge, tip.

    Built as a loft so the outline is a feather from the vane side and a thin
    rachis-ridged spine from the edge. Its own object, so the body silhouette
    never inherits a spike.
    """
    direction = direction.normalized()
    up = Vector((0.0, 1.0, 0.0))  # vane normal: emblem plane faces -Y/+Y
    across = direction.cross(up)
    if across.length < 1e-4:
        across = Vector((1.0, 0.0, 0.0))
    across.normalize()
    up = across.cross(direction).normalized()

    n_i = 96
    js = [-1.0 + 2.0 * k / 13.0 for k in range(14)]

    def shape(t: float) -> float:
        # bare calamus -> vane belly -> drawn-out tip
        if t < 0.22:
            return 0.085
        s = (t - 0.22) / 0.78
        return max(0.015, math.sin(math.pi * (s ** 0.55)) ** 1.05)

    def barb(t: float) -> float:
        # Shallow scallops so the trailing edge reads as barbs, not a leaf rim.
        if t < 0.26:
            return 1.0
        return 1.0 - 0.10 * (0.5 - 0.5 * math.cos((t - 0.26) / 0.74 * 9.0 * 2.0 * math.pi))

    def across_at(t: float, j: float) -> float:
        w = width * shape(t)
        if j < 0.0:
            return w * 0.30 * j
        return w * j * barb(t)

    def thick_at(t: float, j: float) -> float:
        rachis = width * (0.42 if t < 0.22 else 0.30) * (1.0 - t * 0.72)
        return rachis * max(0.05, (1.0 - abs(j)) ** 2.2)

    rings: list[list[Vector]] = []
    for i in range(n_i):
        t = i / (n_i - 1)
        base = root + direction * (length * t)
        ring: list[Vector] = []
        for j in js:
            ring.append(base + across * across_at(t, j) + up * thick_at(t, j))
        for j in reversed(js[1:-1]):
            ring.append(base + across * across_at(t, j) - up * thick_at(t, j))
        rings.append(ring)

    feather_mesh = bpy.data.meshes.new("HeroFeatherMesh")
    bm = bmesh.new()
    ring_verts = [[bm.verts.new(p) for p in ring] for ring in rings]
    ring_len = len(rings[0])
    for i in range(n_i - 1):
        a = ring_verts[i]
        b = ring_verts[i + 1]
        for k in range(ring_len):
            k2 = (k + 1) % ring_len
            try:
                bm.faces.new((a[k], a[k2], b[k2], b[k]))
            except ValueError:
                pass
    for ring in (ring_verts[0], ring_verts[-1]):
        try:
            bm.faces.new(ring)
        except ValueError:
            pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(feather_mesh)
    bm.free()
    feather = bpy.data.objects.new("HeroFeather", feather_mesh)
    bpy.context.collection.objects.link(feather)

    HERO["root"] = root.copy()
    HERO["tip"] = root + direction * length
    HERO["mid"] = root + direction * (length * 0.52)
    HERO["normal"] = up.copy()
    HERO["edge"] = across.copy()
    HERO["radius"] = length * 0.60
    return feather


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


def ndc_bounds(cam, obj, keep=None):
    from bpy_extras.object_utils import world_to_camera_view

    scene = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    xs, ys = [], []
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


def look_at(cam, target: Vector, location: Vector) -> None:
    cam.location = location
    cam.rotation_euler = (target - location).normalized().to_track_quat("-Z", "Y").to_euler()


def center_camera(cam, obj, keep=None) -> None:
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


def fit_camera(cam, obj, direction: Vector, fill: float, keep=None, lens: float = 50.0) -> None:
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    if callable(keep):
        pts = [v.co for v in obj.data.vertices if keep(v.co)]
        center = sum(pts, Vector()) / max(1, len(pts)) if pts else Vector()
    else:
        corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
        center = sum(corners, Vector()) / 8.0
    direction = direction.normalized()
    cam.data.lens = lens
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.01
    cam.data.clip_end = 80.0
    lo, hi, best = 0.08, 40.0, 4.0
    for _ in range(26):
        mid = (lo + hi) * 0.5
        look_at(cam, center, center + direction * mid)
        bpy.context.view_layer.update()
        x0, x1, y0, y1 = ndc_bounds(cam, obj, keep)
        margin = 0.06
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
    print(f"    fit dist={best:.2f} ndcW={x1-x0:.3f} ndcH={y1-y0:.3f}", file=sys.stderr)


def render_views(obj: bpy.types.Object, feather: bpy.types.Object) -> None:
    cam_data = bpy.data.cameras.new("SilhouetteCam")
    cam = bpy.data.objects.new("SilhouetteCam", cam_data)
    bpy.context.collection.objects.link(cam)

    verts = obj.data.vertices
    zs = [v.co.z for v in verts]
    z_top = max(zs)
    head_pts = [v.co for v in verts if abs(v.co.x) < 0.20 and v.co.z > z_top - 0.42]
    head_c = sum(head_pts, Vector()) / max(1, len(head_pts)) if head_pts else Vector((0, 0, 0.5))
    tail_pts = [v.co for v in verts if v.co.z < min(zs) + 0.55]
    tail_c = sum(tail_pts, Vector()) / max(1, len(tail_pts)) if tail_pts else Vector((0, 0, -0.5))
    hero_mid = HERO.get("mid", Vector())
    hero_r = HERO.get("radius", 0.3)
    hero_n = HERO.get("normal", Vector((0.0, 1.0, 0.0)))

    print(f"head_c={tuple(round(x,3) for x in head_c)} tail_c={tuple(round(x,3) for x in tail_c)}", file=sys.stderr)

    head_keep = lambda p: (p - head_c).length < 0.30
    tail_keep = lambda p: (p - tail_c).length < 0.62

    # Canonical honest cameras. Front 3/4 and side 3/4 are fixed rigs, not
    # re-aimed per attempt; the pure profile is published as evidence too.
    front34 = Vector((1.05, -1.75, 0.50))
    side34 = Vector((1.85, -0.95, 0.32))
    profile = Vector((3.20, -0.20, 0.16))
    flight = Vector((0.95, -1.65, 0.70))
    wings = Vector((0.25, -1.35, 1.20))

    views = [
        ("1440-front-34", front34, 0.64, (1440, 900), None, 50.0),
        ("1440-side-34", side34, 0.64, (1440, 900), None, 50.0),
        ("1440-profile", profile, 0.64, (1440, 900), None, 50.0),
        ("1440-flight", flight, 0.64, (1440, 900), None, 50.0),
        ("1440-wings", wings, 0.62, (1440, 900), None, 50.0),
        ("390-front-34", front34, 0.62, (390, 844), None, 50.0),
        ("390-flight", flight, 0.62, (390, 844), None, 50.0),
        ("390-wings", wings, 0.60, (390, 844), None, 50.0),
        ("430-front-34", front34, 0.62, (430, 932), None, 50.0),
        ("430-flight", flight, 0.62, (430, 932), None, 50.0),
        ("head", front34, 0.72, (1440, 900), head_keep, 85.0),
        ("tail", front34, 0.70, (1440, 900), tail_keep, 85.0),
    ]
    feather.hide_render = True
    for name, direction, fill, (w, h), keep, lens in views:
        scene = bpy.context.scene
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        print(f"  view {name}", file=sys.stderr)
        fit_camera(cam, obj, direction, fill, keep, lens)
        scene.render.filepath = os.path.join(OUT, f"{name}.png")
        bpy.ops.render.render(write_still=True)

    # Hero feather study, rendered alone so nothing else frames it.
    obj.hide_render = True
    feather.hide_render = False
    edge_dir = (hero_n * 0.12 + HERO.get("edge", Vector((1.0, 0.0, 0.0))) * 1.0)
    for name, direction, fill in (
        ("hero-feather", -hero_n, 0.80),
        ("hero-feather-edge", edge_dir, 0.80),
    ):
        scene = bpy.context.scene
        scene.render.resolution_x = 1440
        scene.render.resolution_y = 900
        print(f"  view {name}", file=sys.stderr)
        fit_camera(cam, feather, direction, fill, None, 85.0)
        scene.render.filepath = os.path.join(OUT, f"{name}.png")
        bpy.ops.render.render(write_still=True)
    obj.hide_render = False


def main() -> None:
    reset_scene()
    obj = import_and_clean()
    mesh = obj.data
    print(f"source faces={len(mesh.polygons)} verts={len(mesh.vertices)} dim={tuple(round(x,3) for x in obj.dimensions)}", file=sys.stderr)

    welded = weld_islands(obj)
    stats = barrel_body(mesh)
    print(f"barrel {stats}", file=sys.stderr)

    zs = [v.co.z for v in mesh.vertices]
    zmin, zmax = min(zs), max(zs)

    left_shoulder = Vector((-0.14, 0.0, 0.16))
    right_shoulder = Vector((0.30, 0.0, -0.02))
    tail_root = Vector((0.14, 0.0, zmin + (zmax - zmin) * 0.34))

    notched_l = notch_edges(
        mesh,
        lambda p: p.x < -0.30 and p.z > 0.02,
        left_shoulder,
        lobes=5,
        depth=0.085,
    )
    notched_r = notch_edges(
        mesh,
        lambda p: p.x > 0.44,
        right_shoulder,
        lobes=5,
        depth=0.080,
    )
    notched_t = notch_edges(
        mesh,
        lambda p: p.z < tail_root.z - 0.05,
        tail_root,
        lobes=6,
        depth=0.070,
    )
    print(f"notched left={notched_l} right={notched_r} tail={notched_t}", file=sys.stderr)

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()

    # ONE hero feather, built as its own object next to the left primary tip.
    tip = max(
        (v.co.copy() for v in mesh.vertices if v.co.x < -0.55 and v.co.z > 0.30),
        key=lambda p: p.length,
        default=Vector((-0.90, 0.20, 0.70)),
    )
    direction = (tip - left_shoulder).normalized()
    feather = build_hero_feather(tip + direction * 0.02, direction, length=0.44, width=0.085)
    print(f"hero tip={tuple(round(x,3) for x in HERO['tip'])}", file=sys.stderr)

    apply_matte(obj)
    feather.data.materials.append(obj.data.materials[0])
    ys = [v.co.y for v in mesh.vertices]
    print(
        f"final faces={len(mesh.polygons)} verts={len(mesh.vertices)} "
        f"dim={tuple(round(x,3) for x in obj.dimensions)} y_span={max(ys)-min(ys):.3f}",
        file=sys.stderr,
    )

    render_views(obj, feather)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUT, "phoenix-14g.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="NONE",
    )
    with open(os.path.join(OUT, "stats.txt"), "w", encoding="utf-8") as handle:
        handle.write("phase=14G\n")
        handle.write("source=New_Project_2082026.glb\n")
        handle.write(f"welded_islands={welded}\n")
        handle.write(f"body_verts_reshaped={int(stats['body_verts'])}\n")
        handle.write(f"max_half_depth={stats['max_half_depth']:.4f}\n")
        handle.write(f"notched_left={notched_l}\nnotched_right={notched_r}\nnotched_tail={notched_t}\n")
        handle.write("hero_feathers=1\n")
        handle.write(f"faces={len(mesh.polygons)}\nverts={len(mesh.vertices)}\n")
        handle.write(f"dim={obj.dimensions.x:.4f},{obj.dimensions.y:.4f},{obj.dimensions.z:.4f}\n")
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
