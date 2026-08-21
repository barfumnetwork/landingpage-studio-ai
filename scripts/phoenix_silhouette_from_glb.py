"""Import a phoenix GLB and render matte-white silhouette views. No glass, no world."""

from __future__ import annotations

import math
import os
import sys
from mathutils import Vector

import bpy
from bpy_extras.object_utils import world_to_camera_view

GLB = "/tmp/phoenix-acquire/New_Project_2082026.glb"
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
    bpy.context.view_layer.update()
    return obj


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


def look_at(cam: bpy.types.Object, target: Vector, location: Vector) -> None:
    cam.location = location
    direction = target - location
    cam.rotation_euler = direction.normalized().to_track_quat("-Z", "Y").to_euler()


def center_camera(cam: bpy.types.Object, obj: bpy.types.Object) -> None:
    bpy.context.view_layer.update()
    x0, x1, y0, y1 = ndc_bounds(cam, obj)
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


def fit_camera(cam: bpy.types.Object, obj: bpy.types.Object, direction: Vector, fill: float) -> None:
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    corners = [evaluated.matrix_world @ Vector(c) for c in evaluated.bound_box]
    center = sum(corners, Vector()) / 8.0
    direction = direction.normalized()
    cam.data.lens = 50
    cam.data.sensor_width = 36
    cam.data.clip_start = 0.01
    cam.data.clip_end = 80.0
    lo, hi = 0.4, 40.0
    best = 4.0
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


def main() -> None:
    reset_scene()
    obj = import_and_clean()
    print(f"faces={len(obj.data.polygons)} verts={len(obj.data.vertices)} dim={tuple(round(x, 3) for x in obj.dimensions)}", file=sys.stderr)

    data = bpy.data.cameras.new("SilhouetteCam")
    cam = bpy.data.objects.new("SilhouetteCam", data)
    bpy.context.collection.objects.link(cam)

    views = [
        ("front-34", Vector((1.15, -1.80, 0.45)), 0.64, (1440, 900)),
        ("side-34", Vector((1.55, -0.90, 0.35)), 0.64, (1440, 900)),
        ("fly-34", Vector((0.95, -1.65, 0.70)), 0.64, (1440, 900)),
        ("wings", Vector((0.25, -1.10, 1.55)), 0.62, (1440, 900)),
        ("1440", Vector((1.05, -1.75, 0.50)), 0.64, (1440, 900)),
        ("390", Vector((1.65, -0.75, 0.32)), 0.62, (390, 844)),
        ("430", Vector((1.65, -0.75, 0.32)), 0.62, (430, 932)),
        ("mobile-crop", Vector((1.55, -0.70, 0.28)), 0.64, (390, 844)),
    ]
    for name, direction, fill, (w, h) in views:
        scene = bpy.context.scene
        scene.render.resolution_x = w
        scene.render.resolution_y = h
        fit_camera(cam, obj, direction, fill)
        scene.render.filepath = os.path.join(OUT, f"sil-{name}.png")
        bpy.ops.render.render(write_still=True)
        print("WROTE", scene.render.filepath, file=sys.stderr)

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
        handle.write(f"source=New_Project_2082026.glb\n")
        handle.write(f"hero_faces={len(obj.data.polygons)}\n")
        handle.write(f"hero_verts={len(obj.data.vertices)}\n")
        handle.write(f"dim={obj.dimensions.x:.4f},{obj.dimensions.y:.4f},{obj.dimensions.z:.4f}\n")
    print("DONE", file=sys.stderr)


if __name__ == "__main__":
    main()
