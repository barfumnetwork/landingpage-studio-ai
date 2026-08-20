"""Build a connected mythological phoenix in Blender and render matte silhouettes.

ASSET-FIRST. Python only authors a real Blender mesh.
Heraldic rising pose with FLESHY body and in-plane paddle feathers.
Feather width lives in the wing plane so 3/4 / front views show a creature, not needles.
"""

from __future__ import annotations

import math
import os
import sys
from mathutils import Matrix, Vector

import bpy
import bmesh
from bpy_extras.object_utils import world_to_camera_view

OUT = "/tmp/phoenix-asset"
os.makedirs(OUT, exist_ok=True)

WHITE = (0.957, 0.957, 0.957, 1.0)
GRAY = (0.478, 0.478, 0.478, 1.0)


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
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
    world = bpy.data.worlds.new("SilhouetteWorld")
    world.use_nodes = False
    world.color = GRAY[:3]
    scene.world = world


def _rot_y(angle: float) -> Matrix:
    return Matrix.Rotation(angle, 3, "Y")


def build_skin_body() -> bpy.types.Object:
    """Connected skin-tree with anisotropic wing radii so the V has flesh, not wires."""
    # name, parent, co, (radius_a, radius_b)
    nodes: list[tuple[str, str | None, tuple[float, float, float], tuple[float, float]]] = [
        ("chest", None, (0.0, -0.22, 1.70), (0.46, 0.40)),
        ("breast", "chest", (0.0, -0.55, 1.58), (0.34, 0.30)),
        ("belly", "chest", (0.0, 0.22, 1.22), (0.30, 0.26)),
        ("hip", "belly", (0.0, 0.62, 0.86), (0.22, 0.20)),
        ("rump", "hip", (0.0, 0.98, 0.56), (0.16, 0.14)),
        ("tailroot", "rump", (0.0, 1.24, 0.30), (0.11, 0.10)),
        ("neck5", "chest", (0.0, -0.48, 2.18), (0.22, 0.20)),
        ("neck4", "neck5", (0.0, -0.64, 2.62), (0.16, 0.15)),
        ("neck3", "neck4", (0.0, -0.78, 3.02), (0.13, 0.12)),
        ("neck2", "neck3", (0.0, -0.96, 3.32), (0.12, 0.11)),
        ("neck1", "neck2", (0.0, -1.18, 3.28), (0.13, 0.12)),
        ("nape", "neck1", (0.0, -1.40, 3.08), (0.16, 0.15)),
        ("skull", "nape", (0.0, -1.66, 3.28), (0.22, 0.20)),
        ("crown", "skull", (0.0, -1.54, 3.50), (0.11, 0.10)),
        ("beak", "skull", (0.0, -1.98, 3.16), (0.07, 0.055)),
        ("beak_tip", "beak", (0.0, -2.32, 3.06), (0.032, 0.024)),
        ("mandible", "beak", (0.0, -2.08, 3.00), (0.04, 0.03)),
        ("brow", "skull", (0.0, -1.76, 3.40), (0.08, 0.06)),
        ("L_pec", "chest", (-0.32, -0.18, 1.86), (0.20, 0.16)),
        ("R_pec", "chest", (0.32, -0.18, 1.86), (0.20, 0.16)),
        ("L_foot", "chest", (-0.16, 0.00, 1.22), (0.06, 0.05)),
        ("R_foot", "chest", (0.16, 0.00, 1.22), (0.06, 0.05)),
    ]
    for sx, prefix in ((-1.0, "L"), (1.0, "R")):
        # Wide chord (second radius) so each wing is a paddle, not a tube.
        nodes += [
            (f"{prefix}_sho", "chest", (sx * 0.48, -0.12, 2.08), (0.22, 0.38)),
            (f"{prefix}_arm", f"{prefix}_sho", (sx * 0.78, 0.06, 2.62), (0.16, 0.42)),
            (f"{prefix}_elb", f"{prefix}_arm", (sx * 0.98, 0.22, 3.18), (0.12, 0.36)),
            (f"{prefix}_wri", f"{prefix}_elb", (sx * 1.08, 0.34, 3.58), (0.08, 0.26)),
            (f"{prefix}_tip", f"{prefix}_wri", (sx * 1.12, 0.42, 3.88), (0.05, 0.16)),
            (f"{prefix}_trail", f"{prefix}_sho", (sx * 0.58, 0.22, 2.28), (0.12, 0.28)),
        ]

    index = {name: i for i, (name, *_rest) in enumerate(nodes)}
    verts = [co for (_n, _p, co, _r) in nodes]
    edges = []
    for name, parent, _co, _r in nodes:
        if parent is None:
            continue
        edges.append((index[parent], index[name]))

    mesh = bpy.data.meshes.new("PhoenixSpine")
    mesh.from_pydata(verts, edges, [])
    obj = bpy.data.objects.new("PhoenixBody", mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    skin = obj.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    skin.branch_smoothing = 1.0

    for i, sv in enumerate(obj.data.skin_vertices[0].data):
        ra, rb = nodes[i][3]
        sv.radius = (ra, rb)
        sv.use_root = nodes[i][0] == "chest"
        sv.use_loose = False

    sub = obj.modifiers.new("Sub", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    bpy.ops.object.modifier_apply(modifier="Skin")
    bpy.ops.object.modifier_apply(modifier="Sub")

    remesh = obj.modifiers.new("Voxel", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.034
    bpy.ops.object.modifier_apply(modifier="Voxel")

    smooth = obj.modifiers.new("Smooth", "SMOOTH")
    smooth.factor = 1.0
    smooth.iterations = 18
    bpy.ops.object.modifier_apply(modifier="Smooth")
    return obj


def feather_mesh(length: float, width: float, thick: float, curl: float, name: str) -> bpy.types.Object:
    """Physical feather: shaft + wide barb paddle + tapered tip. Grows along +X."""
    bm = bmesh.new()
    segs = 16
    radial = 10
    rings: list[list[bmesh.types.BMVert]] = []
    for i in range(segs + 1):
        u = i / segs
        # Wide paddle through the middle, defined tip, narrow root that plugs into flesh.
        belly = math.sin(math.pi * min(1.0, max(0.0, (u - 0.02) / 0.98) ** 0.48)) ** 0.38
        tip = 1.0 - ((u - 0.64) / 0.36) ** 1.15 if u > 0.64 else 1.0
        env = max(0.12, belly * max(0.08, tip))
        x = (u**0.9) * length
        z = math.sin(u * math.pi) * curl
        rx = max(0.014, thick * (1.05 - u * 0.4))
        ry = max(0.022, width * 0.5 * env)
        ring = []
        for j in range(radial):
            a = (j / radial) * math.pi * 2.0
            ring.append(bm.verts.new((x, math.cos(a) * ry, z + math.sin(a) * rx)))
        rings.append(ring)
    bm.verts.ensure_lookup_table()
    for i in range(segs):
        a = rings[i]
        b = rings[i + 1]
        for j in range(radial):
            n = (j + 1) % radial
            bm.faces.new((a[j], a[n], b[n], b[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)

    shaft = bpy.data.meshes.new(name + "Shaft")
    bm2 = bmesh.new()
    bmesh.ops.create_cone(
        bm2,
        cap_ends=True,
        segments=6,
        radius1=thick * 0.75,
        radius2=thick * 0.12,
        depth=length * 0.93,
    )
    bmesh.ops.rotate(bm2, verts=bm2.verts, cent=(0, 0, 0), matrix=_rot_y(math.pi / 2))
    bmesh.ops.translate(bm2, verts=bm2.verts, vec=(length * 0.46, 0.0, thick * 0.22))
    bm2.to_mesh(shaft)
    bm2.free()
    shaft_obj = bpy.data.objects.new(name + "Shaft", shaft)
    bpy.context.collection.objects.link(shaft_obj)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    shaft_obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


def orient_feather(obj: bpy.types.Object, root: Vector, tip: Vector, width_hint: Vector) -> None:
    """Point local +X along the shaft; local +Y (feather width) follows width_hint.

    For wings, width_hint is in the wing plane so front/3/4 views see paddles, not edges.
    """
    root = Vector(root)
    tip = Vector(tip)
    x_axis = tip - root
    if x_axis.length < 1e-6:
        x_axis = Vector((1.0, 0.0, 0.0))
    x_axis.normalize()
    hint = Vector(width_hint)
    y_axis = hint - x_axis * hint.dot(x_axis)
    if y_axis.length < 1e-5:
        y_axis = Vector((0.0, 1.0, 0.0))
        y_axis = y_axis - x_axis * y_axis.dot(x_axis)
    y_axis.normalize()
    z_axis = x_axis.cross(y_axis)
    if z_axis.length < 1e-5:
        z_axis = Vector((0.0, 0.0, 1.0))
    z_axis.normalize()
    y_axis = z_axis.cross(x_axis).normalized()
    mat = Matrix((x_axis, y_axis, z_axis)).transposed()
    obj.location = root
    obj.rotation_euler = mat.to_euler()


def _fan_wing(side: float, feathers: list[bpy.types.Object]) -> None:
    sx = 1.0 if side > 0 else -1.0
    # Width lies in the vertical wing plane (mostly XZ) so the V reads from the front.
    width_hint = Vector((sx * 0.35, 0.12, 1.0))

    def place(root, length, width, thick, curl, ang, back, name):
        root_v = Vector(root)
        tip = root_v + Vector(
            (
                sx * math.sin(ang) * length,
                back,
                math.cos(ang) * length,
            )
        )
        f = feather_mesh(length, width, thick, curl, name)
        orient_feather(f, root_v, tip, width_hint)
        feathers.append(f)

    # Dense overlapping coverts — these MUST fill a solid inner wing.
    for i in range(7):
        t = i / 6.0
        place(
            (sx * (0.42 + t * 0.28), -0.06 + t * 0.10, 1.98 + t * 0.72),
            0.70 + t * 0.22,
            0.42 - t * 0.06,
            0.055,
            0.03,
            math.radians(10 + t * 22),
            0.08 + t * 0.05,
            f"Covert{sx}_{i}",
        )
    for i in range(6):
        t = i / 5.0
        place(
            (sx * (0.62 + t * 0.28), 0.06 + t * 0.12, 2.40 + t * 0.78),
            0.95 + t * 0.22,
            0.36 - t * 0.06,
            0.048,
            0.05,
            math.radians(14 + t * 24),
            0.12 + t * 0.06,
            f"Sec{sx}_{i}",
        )
    for i in range(6):
        t = i / 5.0
        place(
            (sx * (0.92 + t * 0.16), 0.24 + t * 0.14, 3.20 + t * 0.52),
            1.18 + t * 0.38,
            0.26 - t * 0.08,
            0.042,
            0.07 + t * 0.02,
            math.radians(18 + t * 30),
            0.16 + t * 0.08,
            f"Pri{sx}_{i}",
        )


def build_feathers() -> list[bpy.types.Object]:
    feathers: list[bpy.types.Object] = []

    crest = [
        ((0.00, -1.62, 3.42), (0.04, -1.82, 4.02), (0.2, 0.0, 1.0), 0.58, 0.14),
        ((0.06, -1.52, 3.46), (0.12, -1.48, 4.12), (0.4, 0.1, 1.0), 0.68, 0.15),
        ((-0.05, -1.50, 3.44), (-0.10, -1.28, 4.08), (-0.3, 0.1, 1.0), 0.64, 0.14),
        ((0.02, -1.42, 3.36), (0.06, -1.08, 3.98), (0.15, 0.3, 1.0), 0.58, 0.12),
    ]
    for i, (root, tip, hint, length, width) in enumerate(crest):
        f = feather_mesh(length, width, 0.028, 0.05, f"Crest{i}")
        orient_feather(f, root, tip, hint)
        feathers.append(f)

    _fan_wing(-1.0, feathers)
    _fan_wing(1.0, feathers)

    for i in range(9):
        t = (i - 4) / 4.0
        length = 1.70 + (1.0 - abs(t)) * 1.20
        root = Vector((t * 0.07, 1.16, 0.34))
        tip = Vector((t * 0.42, 1.62 + (1.0 - abs(t)) * 0.48, 0.06 - length * 0.70))
        f = feather_mesh(length, 0.22 + (1.0 - abs(t)) * 0.06, 0.04, 0.12 + abs(t) * 0.03, f"Tail{i}")
        orient_feather(f, root, tip, Vector((1.0, 0.0, 0.15)))
        feathers.append(f)
    return feathers


def white_material() -> bpy.types.Material:
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
    return mat


def assign_white(objects: list[bpy.types.Object]) -> None:
    mat = white_material()
    for obj in objects:
        if obj.type != "MESH":
            continue
        obj.data.materials.clear()
        obj.data.materials.append(mat)


def look_at(cam: bpy.types.Object, target: Vector, location: Vector) -> None:
    cam.location = location
    direction = target - location
    if direction.length < 1e-6:
        direction = Vector((0.0, -1.0, 0.0))
    cam.rotation_euler = direction.normalized().to_track_quat("-Z", "Y").to_euler()


def ndc_bounds(cam: bpy.types.Object, obj: bpy.types.Object) -> tuple[float, float, float, float]:
    scene = bpy.context.scene
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    xs: list[float] = []
    ys: list[float] = []
    for vert in mesh.vertices:
        ndc = world_to_camera_view(scene, cam, evaluated.matrix_world @ vert.co)
        xs.append(ndc.x)
        ys.append(ndc.y)
    evaluated.to_mesh_clear()
    return min(xs), max(xs), min(ys), max(ys)


def center_camera(cam: bpy.types.Object, obj: bpy.types.Object) -> None:
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj)
    cx, cy = (x0 + x1) * 0.5, (y0 + y1) * 0.5
    dist = cam.location.length if False else (cam.matrix_world.translation - Vector((0, 0, 0))).length
    # Distance to look target along camera -Z.
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


def fit_camera(cam: bpy.types.Object, obj: bpy.types.Object, direction: Vector, fill: float) -> None:
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
    center = sum(corners, Vector()) / 8.0
    direction = direction.normalized()
    cam.data.lens = 50
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.05
    cam.data.clip_end = 120.0

    lo, hi = 1.2, 48.0
    best = 8.0
    for _ in range(24):
        mid = (lo + hi) * 0.5
        look_at(cam, center, center + direction * mid)
        bpy.context.view_layer.update()
        x0, x1, y0, y1 = ndc_bounds(cam, obj)
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
    center_camera(cam, obj)
    bpy.context.scene.camera = cam
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj)
    print(
        f"cam dist={best:.2f} ndcW={x1 - x0:.3f} ndcH={y1 - y0:.3f} "
        f"x=[{x0:.3f},{x1:.3f}] y=[{y0:.3f},{y1:.3f}]",
        file=sys.stderr,
    )


def make_camera() -> bpy.types.Object:
    data = bpy.data.cameras.new("SilhouetteCam")
    data.lens = 50
    obj = bpy.data.objects.new("SilhouetteCam", data)
    bpy.context.collection.objects.link(obj)
    bpy.context.scene.camera = obj
    return obj


def render_view(path: str, w: int, h: int) -> None:
    scene = bpy.context.scene
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("WROTE", path, file=sys.stderr)


def decimate(obj: bpy.types.Object, ratio: float, name: str) -> bpy.types.Object:
    dup = obj.copy()
    dup.data = obj.data.copy()
    dup.name = name
    bpy.context.collection.objects.link(dup)
    bpy.ops.object.select_all(action="DESELECT")
    dup.select_set(True)
    bpy.context.view_layer.objects.active = dup
    mod = dup.modifiers.new("Lod", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="Lod")
    return dup


def export_glb(objects: list[bpy.types.Object], path: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=False,
        export_normals=True,
        export_materials="NONE",
    )
    print("WROTE", path, file=sys.stderr)


def world_bbox(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    zs = [c.z for c in corners]
    return Vector((min(xs), min(ys), min(zs))), Vector((max(xs), max(ys), max(zs)))


def main() -> None:
    reset_scene()
    body = build_skin_body()
    feathers = build_feathers()
    parts = [body, *feathers]
    assign_white(parts)

    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    phoenix = bpy.context.view_layer.objects.active
    phoenix.name = "Phoenix"

    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    phoenix.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()

    mins, maxs = world_bbox(phoenix)
    size = maxs - mins
    print(f"bbox=({size.x:.2f},{size.y:.2f},{size.z:.2f}) aspectW/H={size.x / max(size.z, 0.01):.2f}", file=sys.stderr)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "phoenix.blend"))

    cam = make_camera()
    views = [
        ("front-34", Vector((1.05, -1.85, 0.42)), 0.64, (1440, 900)),
        ("side-34", Vector((2.05, -0.35, 0.28)), 0.64, (1440, 900)),
        ("fly-34", Vector((0.95, -1.65, 0.62)), 0.64, (1440, 900)),
        ("wings", Vector((0.08, -0.55, 2.15)), 0.62, (1440, 900)),
        ("1440", Vector((1.05, -1.75, 0.48)), 0.64, (1440, 900)),
        ("390", Vector((0.95, -1.55, 0.22)), 0.62, (390, 844)),
        ("430", Vector((0.95, -1.55, 0.22)), 0.62, (430, 932)),
        ("mobile-crop", Vector((0.70, -1.35, 0.18)), 0.66, (390, 844)),
    ]
    for name, direction, fill, (w, h) in views:
        scene = bpy.context.scene
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        fit_camera(cam, phoenix, direction, fill)
        render_view(os.path.join(OUT, f"sil-{name}.png"), w, h)

    export_glb([phoenix], os.path.join(OUT, "phoenix-hero.glb"))
    gallery = decimate(phoenix, 0.40, "PhoenixGallery")
    export_glb([gallery], os.path.join(OUT, "phoenix-gallery.glb"))
    mobile = decimate(phoenix, 0.22, "PhoenixMobile")
    export_glb([mobile], os.path.join(OUT, "phoenix-mobile.glb"))

    with open(os.path.join(OUT, "stats.txt"), "w", encoding="utf-8") as handle:
        handle.write(f"hero_faces={len(phoenix.data.polygons)}\n")
        handle.write(f"gallery_faces={len(gallery.data.polygons)}\n")
        handle.write(f"mobile_faces={len(mobile.data.polygons)}\n")
        handle.write(f"bbox={size.x:.3f},{size.y:.3f},{size.z:.3f}\n")
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
