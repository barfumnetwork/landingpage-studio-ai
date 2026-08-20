"""Which axis is wingspan, which is chest depth? Render clean axis views + symmetry test."""

from __future__ import annotations

import math
import os
import sys

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

GLB = "/tmp/phoenix-acquire/New_Project_2082026.glb"
OUT = "/tmp/phoenix-probe"
os.makedirs(OUT, exist_ok=True)
WHITE = (0.957, 0.957, 0.957, 1.0)
GRAY = (0.478, 0.478, 0.478, 1.0)


def reset_scene():
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
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    world = bpy.data.worlds.new("W")
    world.use_nodes = False
    world.color = GRAY[:3]
    scene.world = world


def load():
    bpy.ops.import_scene.gltf(filepath=GLB)
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    obj.location = (0.0, 0.0, 0.0)
    mat = bpy.data.materials.new("M")
    mat.diffuse_color = WHITE
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    bpy.context.view_layer.update()
    return obj


def symmetry(obj, axis: int, sample: int = 4000) -> float:
    verts = [v.co.copy() for v in obj.data.vertices]
    n = len(verts)
    tree = KDTree(n)
    for i, co in enumerate(verts):
        tree.insert(co, i)
    tree.balance()
    step = max(1, n // sample)
    total = 0.0
    count = 0
    for co in verts[::step]:
        mirror = co.copy()
        mirror[axis] = -mirror[axis]
        _c, _i, dist = tree.find(mirror)
        total += dist
        count += 1
    return total / max(1, count)


def main():
    reset_scene()
    obj = load()
    print(f"dim={tuple(round(x,4) for x in obj.dimensions)}", file=sys.stderr)
    for axis, name in ((0, "X"), (1, "Y"), (2, "Z")):
        print(f"mirror-{name} mean nearest dist = {symmetry(obj, axis):.4f}", file=sys.stderr)

    cam_data = bpy.data.cameras.new("C")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("C", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    span = max(obj.dimensions) * 1.1
    cam_data.ortho_scale = span

    dirs = {
        "plus-x": Vector((1, 0, 0)),
        "minus-y": Vector((0, -1, 0)),
        "plus-y": Vector((0, 1, 0)),
        "plus-z": Vector((0, 0, 1)),
    }
    for name, d in dirs.items():
        cam.location = d * (span * 3.0)
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        bpy.context.scene.render.filepath = os.path.join(OUT, f"axis-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("WROTE", bpy.context.scene.render.filepath, file=sys.stderr)
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
