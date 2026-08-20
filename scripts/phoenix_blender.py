"""Build a connected mythological phoenix in Blender and render matte silhouettes.

ASSET-FIRST. Python is only used to author a real Blender mesh.
No Three.js primitives. No glass. No world. No UI.
"""

from __future__ import annotations

import math
import os
import sys
from mathutils import Matrix, Vector

import bpy
import bmesh

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


def new_metaball() -> bpy.types.Object:
    mb = bpy.data.metaballs.new("PhoenixCore")
    mb.resolution = 0.045
    mb.render_resolution = 0.04
    mb.threshold = 0.42
    obj = bpy.data.objects.new("PhoenixCore", mb)
    bpy.context.collection.objects.link(obj)
    return obj


def add_ball(mb: bpy.types.MetaBall, co, radius: float, stiffness: float = 3.2) -> None:
    el = mb.elements.new(type="BALL")
    el.co = Vector(co)
    el.radius = radius
    el.stiffness = stiffness
    el.use_negative = False


def add_ellipsoid(mb: bpy.types.MetaBall, co, size, stiffness: float = 3.0) -> None:
    el = mb.elements.new(type="ELLIPSOID")
    el.co = Vector(co)
    el.size_x, el.size_y, el.size_z = size
    el.stiffness = stiffness


def build_core() -> bpy.types.Object:
    """Fused sculpture core: beak → skull → S-neck → chest → torso → hip → rump + V wing flesh.

    Upright rearing pose so the silhouette is tall enough for 390px (55–70% frame height)
    without cropping head, wings, or tail.
    """
    obj = new_metaball()
    mb = obj.data

    # Head toward -Y, tail +Y, up +Z, right +X.
    # Hooked beak — long enough to read in silhouette.
    add_ellipsoid(mb, (0.0, -2.22, 2.08), (0.045, 0.22, 0.05), 4.4)
    add_ellipsoid(mb, (0.0, -2.08, 2.00), (0.055, 0.14, 0.055), 4.2)
    add_ellipsoid(mb, (0.0, -1.98, 1.92), (0.05, 0.10, 0.04), 4.0)  # lower mandible

    # Skull / crown
    add_ellipsoid(mb, (0.0, -1.78, 2.18), (0.20, 0.22, 0.18), 3.4)
    add_ellipsoid(mb, (0.0, -1.62, 2.32), (0.14, 0.12, 0.12), 3.3)
    add_ball(mb, (0.0, -1.52, 2.08), 0.16, 3.6)  # nape

    # S-neck: high arch, then drop into chest.
    add_ball(mb, (0.0, -1.38, 2.28), 0.13, 3.5)
    add_ball(mb, (0.0, -1.22, 2.42), 0.12, 3.5)
    add_ball(mb, (0.0, -1.02, 2.38), 0.13, 3.4)
    add_ball(mb, (0.0, -0.86, 2.12), 0.15, 3.3)
    add_ball(mb, (0.0, -0.72, 1.82), 0.18, 3.2)
    add_ball(mb, (0.0, -0.58, 1.48), 0.22, 3.1)

    # Chest / torso / hip / rump — overlapping on purpose
    add_ellipsoid(mb, (0.0, -0.32, 1.12), (0.42, 0.44, 0.40), 2.7)
    add_ellipsoid(mb, (0.0, 0.08, 0.92), (0.32, 0.40, 0.32), 2.7)
    add_ellipsoid(mb, (0.0, 0.48, 0.72), (0.26, 0.36, 0.26), 2.7)
    add_ellipsoid(mb, (0.0, 0.88, 0.54), (0.20, 0.32, 0.20), 2.8)
    add_ellipsoid(mb, (0.0, 1.22, 0.38), (0.15, 0.28, 0.16), 2.9)
    add_ellipsoid(mb, (0.0, 1.50, 0.20), (0.11, 0.22, 0.12), 3.1)

    # Shoulders + inner wing flesh in a steep V (up, slightly back)
    for side in (-1.0, 1.0):
        add_ellipsoid(mb, (side * 0.38, -0.18, 1.28), (0.26, 0.20, 0.18), 3.0)
        add_ellipsoid(mb, (side * 0.78, -0.02, 1.62), (0.38, 0.22, 0.14), 2.6)
        add_ellipsoid(mb, (side * 1.18, 0.18, 1.98), (0.42, 0.20, 0.12), 2.5)
        add_ellipsoid(mb, (side * 1.52, 0.38, 2.22), (0.34, 0.16, 0.10), 2.6)
        add_ellipsoid(mb, (side * 1.78, 0.58, 2.32), (0.22, 0.12, 0.08), 2.8)

    # Tucked talons — creature, not a floating torso
    add_ellipsoid(mb, (0.12, -0.08, 0.62), (0.06, 0.10, 0.16), 3.2)
    add_ellipsoid(mb, (-0.12, -0.08, 0.62), (0.06, 0.10, 0.16), 3.2)

    bpy.context.view_layer.update()
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    mesh_obj = bpy.context.view_layer.objects.active
    mesh_obj.name = "PhoenixBody"

    remesh = mesh_obj.modifiers.new("Voxel", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.032
    bpy.ops.object.modifier_apply(modifier="Voxel")

    smooth = mesh_obj.modifiers.new("Smooth", "SMOOTH")
    smooth.factor = 1.0
    smooth.iterations = 22
    bpy.ops.object.modifier_apply(modifier="Smooth")

    sub = mesh_obj.modifiers.new("Sub", "SUBSURF")
    sub.levels = 1
    sub.render_levels = 1
    bpy.ops.object.modifier_apply(modifier="Sub")
    return mesh_obj


def _rot_y(angle: float) -> Matrix:
    return Matrix.Rotation(angle, 3, "Y")


def feather_mesh(length: float, width: float, thick: float, curl: float, name: str) -> bpy.types.Object:
    """Physical feather: shaft + barb body + tapered tip. Grows along +X."""
    bm = bmesh.new()
    segs = 16
    radial = 10
    rings: list[list[bmesh.types.BMVert]] = []
    for i in range(segs + 1):
        u = i / segs
        # Wide in the first two thirds, then a defined tip.
        belly = math.sin(math.pi * min(1.0, u**0.62)) ** 0.48
        tip = 1.0 - ((u - 0.68) / 0.32) ** 1.25 if u > 0.68 else 1.0
        env = max(0.12, belly * max(0.08, tip))
        # Slight barb notching so it does not read as a capsule.
        notch = 1.0 - 0.07 * abs(math.sin(u * math.pi * 7.0)) * (1.0 if u > 0.10 else u / 0.10)
        x = (u**0.90) * length
        z = math.sin(u * math.pi) * curl
        rx = max(0.010, thick * (0.95 + (1.0 - u) * 0.35))
        ry = max(0.018, width * 0.5 * env * notch)
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
        segments=7,
        radius1=thick * 0.62,
        radius2=thick * 0.14,
        depth=length * 0.94,
    )
    bmesh.ops.rotate(bm2, verts=bm2.verts, cent=(0, 0, 0), matrix=_rot_y(math.pi / 2))
    bmesh.ops.translate(bm2, verts=bm2.verts, vec=(length * 0.47, 0.0, thick * 0.18))
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


def orient_x_to(obj: bpy.types.Object, root: Vector, tip: Vector, roll: float = 0.0) -> None:
    """Place a +X feather so it grows from root toward tip."""
    root = Vector(root)
    tip = Vector(tip)
    direction = tip - root
    if direction.length < 1e-6:
        direction = Vector((1.0, 0.0, 0.0))
    obj.location = root
    quat = direction.normalized().to_track_quat("X", "Z")
    obj.rotation_euler = quat.to_euler()
    obj.rotation_euler.rotate_axis("X", roll)


def build_feathers() -> list[bpy.types.Object]:
    feathers: list[bpy.types.Object] = []

    # Crown / crest — long plumes growing off the skull, back and up.
    crest = [
        ((0.00, -1.70, 2.28), (0.04, -1.92, 2.72), 0.46, 0.10),
        ((0.05, -1.62, 2.34), (0.10, -1.70, 2.88), 0.58, 0.11),
        ((-0.04, -1.58, 2.32), (-0.08, -1.48, 2.86), 0.54, 0.10),
        ((0.02, -1.50, 2.26), (0.06, -1.22, 2.78), 0.50, 0.09),
    ]
    for i, (root, tip, length, width) in enumerate(crest):
        f = feather_mesh(length, width, 0.022, 0.07, f"Crest{i}")
        orient_x_to(f, root, tip, roll=(i - 1.5) * 0.12)
        feathers.append(f)

    def wing(side: float) -> None:
        sx = 1.0 if side > 0 else -1.0

        # Coverts — short, overlapping, grow out of the shoulder flesh.
        coverts = [
            ((sx * 0.42, -0.12, 1.32), (sx * 0.92, 0.02, 1.58), 0.58, 0.22),
            ((sx * 0.58, -0.04, 1.48), (sx * 1.18, 0.12, 1.82), 0.68, 0.24),
            ((sx * 0.74, 0.06, 1.64), (sx * 1.38, 0.24, 2.02), 0.76, 0.24),
            ((sx * 0.90, 0.16, 1.80), (sx * 1.52, 0.36, 2.18), 0.72, 0.22),
        ]
        for i, (root, tip, length, width) in enumerate(coverts):
            f = feather_mesh(length, width, 0.042, 0.05, f"Covert{sx}_{i}")
            orient_x_to(f, root, tip, roll=sx * 0.18)
            feathers.append(f)

        secondaries = [
            ((sx * 0.70, 0.04, 1.52), (sx * 1.42, 0.28, 2.08), 0.88, 0.24),
            ((sx * 0.86, 0.14, 1.68), (sx * 1.62, 0.42, 2.22), 0.98, 0.23),
            ((sx * 1.02, 0.24, 1.84), (sx * 1.78, 0.54, 2.32), 1.06, 0.22),
            ((sx * 1.16, 0.34, 1.96), (sx * 1.92, 0.66, 2.38), 1.10, 0.20),
            ((sx * 1.28, 0.44, 2.06), (sx * 2.02, 0.76, 2.40), 1.04, 0.18),
        ]
        for i, (root, tip, length, width) in enumerate(secondaries):
            f = feather_mesh(length, width, 0.038, 0.07, f"Sec{sx}_{i}")
            orient_x_to(f, root, tip, roll=sx * (0.10 + i * 0.04))
            feathers.append(f)

        primaries = [
            ((sx * 1.18, 0.28, 1.92), (sx * 2.05, 0.62, 2.48), 1.22, 0.18),
            ((sx * 1.32, 0.38, 2.04), (sx * 2.22, 0.78, 2.58), 1.38, 0.17),
            ((sx * 1.44, 0.48, 2.12), (sx * 2.38, 0.92, 2.62), 1.52, 0.16),
            ((sx * 1.54, 0.56, 2.18), (sx * 2.48, 1.08, 2.58), 1.62, 0.15),
            ((sx * 1.62, 0.64, 2.22), (sx * 2.52, 1.22, 2.48), 1.58, 0.14),
            ((sx * 1.68, 0.70, 2.24), (sx * 2.42, 1.32, 2.32), 1.36, 0.13),
        ]
        for i, (root, tip, length, width) in enumerate(primaries):
            f = feather_mesh(length, width, 0.034, 0.10 + i * 0.012, f"Pri{sx}_{i}")
            orient_x_to(f, root, tip, roll=sx * (0.06 + i * 0.03))
            feathers.append(f)

    wing(-1.0)
    wing(1.0)

    # 9 long individual tail feathers growing from the rump, hanging and fanning.
    tail = [
        ((-0.10, 1.28, 0.28), (-0.22, 2.05, -0.55), 1.55, 0.16),
        ((-0.06, 1.34, 0.24), (-0.14, 2.28, -0.72), 1.85, 0.17),
        ((-0.03, 1.38, 0.22), (-0.06, 2.48, -0.88), 2.15, 0.18),
        ((0.00, 1.42, 0.20), (0.02, 2.62, -1.02), 2.42, 0.19),
        ((0.02, 1.44, 0.18), (0.08, 2.72, -1.12), 2.58, 0.20),
        ((0.05, 1.40, 0.22), (0.16, 2.52, -0.92), 2.22, 0.18),
        ((0.08, 1.36, 0.26), (0.22, 2.32, -0.70), 1.88, 0.17),
        ((0.10, 1.30, 0.30), (0.24, 2.08, -0.48), 1.58, 0.15),
        ((0.04, 1.26, 0.34), (0.10, 1.92, -0.22), 1.32, 0.14),
    ]
    for i, (root, tip, length, width) in enumerate(tail):
        f = feather_mesh(length, width, 0.032, 0.16 + i * 0.012, f"Tail{i}")
        orient_x_to(f, root, tip, roll=(i - 4) * 0.05)
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


def world_bbox(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in objects:
        if obj.type != "MESH":
            continue
        evaluated = obj.evaluated_get(depsgraph)
        for corner in evaluated.bound_box:
            w = evaluated.matrix_world @ Vector(corner)
            mins.x, mins.y, mins.z = min(mins.x, w.x), min(mins.y, w.y), min(mins.z, w.z)
            maxs.x, maxs.y, maxs.z = max(maxs.x, w.x), max(maxs.y, w.y), max(maxs.z, w.z)
    return mins, maxs


def look_at(cam: bpy.types.Object, target: Vector, location: Vector) -> None:
    cam.location = location
    direction = (target - location)
    if direction.length < 1e-6:
        direction = Vector((0.0, -1.0, 0.0))
    cam.rotation_euler = direction.normalized().to_track_quat("-Z", "Y").to_euler()


def fit_camera(cam: bpy.types.Object, objects: list[bpy.types.Object], direction: Vector, fill: float) -> None:
    mins, maxs = world_bbox(objects)
    center = (mins + maxs) * 0.5
    size = maxs - mins
    height = max(size.z, 0.8)
    width = max(size.x, size.y * 0.35, 0.8)
    cam.data.lens = 50
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.05
    cam.data.clip_end = 80.0
    aspect = bpy.context.scene.render.resolution_x / max(1, bpy.context.scene.render.resolution_y)
    v_fov = cam.data.angle
    h_fov = 2 * math.atan(math.tan(v_fov * 0.5) * aspect)
    # Prefer height fill (55–70%). Width only pulls back enough to keep the whole creature in frame.
    dist_h = (height * 0.5) / (math.tan(v_fov * 0.5) * fill)
    dist_w = (width * 0.5) / (math.tan(h_fov * 0.5) * 0.90)
    dist = max(dist_h, dist_w)
    direction = direction.normalized()
    look_at(cam, center, center + direction * dist)
    bpy.context.scene.camera = cam
    print(
        f"bbox size=({size.x:.2f},{size.y:.2f},{size.z:.2f}) fill={fill} dist={dist:.2f}",
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


def main() -> None:
    reset_scene()
    body = build_core()
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

    cam = make_camera()
    views = [
        ("front-34", Vector((1.15, -1.70, 0.62)), 0.64, (1440, 900)),
        ("side-34", Vector((1.85, -0.45, 0.42)), 0.62, (1440, 900)),
        ("fly-34", Vector((1.05, -1.55, 0.78)), 0.64, (1440, 900)),
        ("wings", Vector((0.12, -0.28, 2.35)), 0.60, (1440, 900)),
        ("1440", Vector((1.10, -1.60, 0.72)), 0.64, (1440, 900)),
        ("390", Vector((0.72, -1.35, 0.55)), 0.62, (390, 844)),
        ("430", Vector((0.72, -1.35, 0.55)), 0.62, (430, 932)),
        ("mobile-crop", Vector((0.55, -1.15, 0.48)), 0.66, (390, 844)),
    ]
    for name, direction, fill, (w, h) in views:
        scene = bpy.context.scene
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        fit_camera(cam, [phoenix], direction, fill)
        render_view(os.path.join(OUT, f"sil-{name}.png"), w, h)

    export_glb([phoenix], os.path.join(OUT, "phoenix-hero.glb"))
    gallery = decimate(phoenix, 0.35, "PhoenixGallery")
    export_glb([gallery], os.path.join(OUT, "phoenix-gallery.glb"))
    mobile = decimate(phoenix, 0.18, "PhoenixMobile")
    export_glb([mobile], os.path.join(OUT, "phoenix-mobile.glb"))

    stats = os.path.join(OUT, "stats.txt")
    with open(stats, "w", encoding="utf-8") as handle:
        handle.write(f"hero_faces={len(phoenix.data.polygons)}\n")
        handle.write(f"gallery_faces={len(gallery.data.polygons)}\n")
        handle.write(f"mobile_faces={len(mobile.data.polygons)}\n")
        mins, maxs = world_bbox([phoenix])
        size = maxs - mins
        handle.write(f"bbox={size.x:.3f},{size.y:.3f},{size.z:.3f}\n")
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
