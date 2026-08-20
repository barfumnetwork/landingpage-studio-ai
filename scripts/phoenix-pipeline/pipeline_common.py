"""Shared helpers for the Phoenix asset pipeline (Blender side).

Kept deliberately small: argument parsing, orientation normalisation and the
frozen canonical camera rig. The camera directions live here so that no future
pass can quietly re-aim a view to make an asset pass.
"""

from __future__ import annotations

import math
import sys

# Canonical rig. Directions are camera offsets from the subject centre in a
# Z-up, -Y facing frame. Frozen: normalise the ASSET, never the camera.
CANONICAL_VIEWS: dict[str, tuple[float, float, float]] = {
    "front-34": (1.05, -1.75, 0.50),
    "side-34": (1.85, -0.95, 0.32),
    "profile": (3.20, -0.20, 0.16),
    "flight": (0.95, -1.65, 0.70),
    "wings": (0.25, -1.35, 1.20),
}

# Frame sizes the gate is judged at.
FRAMES: dict[str, tuple[int, int]] = {
    "1440": (1440, 900),
    "390": (390, 844),
    "430": (430, 932),
}

def _srgb_to_linear(value: float) -> float:
    if value <= 0.04045:
        return value / 12.92
    return ((value + 0.055) / 1.055) ** 2.4


# Authored as display sRGB and converted, so with the Standard view transform
# the PNG really lands on 244 white over 122 gray.
WHITE_DISPLAY = 0.957
GRAY_DISPLAY = 0.478
WHITE = (_srgb_to_linear(WHITE_DISPLAY),) * 3 + (1.0,)
GRAY = (_srgb_to_linear(GRAY_DISPLAY),) * 3 + (1.0,)


def argv_after_dashes() -> list[str]:
    if "--" in sys.argv:
        return sys.argv[sys.argv.index("--") + 1 :]
    return []


def parse_args(argv: list[str]) -> dict[str, str]:
    args: dict[str, str] = {}
    key: str | None = None
    for token in argv:
        if token.startswith("--"):
            key = token[2:]
            args[key] = "true"
        elif key:
            args[key] = token
            key = None
    return args


def normalize_orientation(objects: list, faces: str = "-y", up: str = "z") -> None:
    """Rotate the asset into the canonical frame: Z up, facing -Y.

    Suppliers hand over Y-up or differently facing assets; we move the asset,
    not the cameras.
    """
    import bpy
    from mathutils import Euler

    rot = Euler((0.0, 0.0, 0.0))
    if up == "y":
        rot.x += math.radians(90.0)
    yaw = {"-y": 0.0, "+y": 180.0, "+x": 90.0, "-x": -90.0}.get(faces, 0.0)
    rot.z += math.radians(yaw)
    if abs(rot.x) < 1e-9 and abs(rot.z) < 1e-9:
        return
    matrix = rot.to_matrix().to_4x4()
    for obj in objects:
        obj.matrix_world = matrix @ obj.matrix_world
    bpy.context.view_layer.update()


def setup_matte_scene() -> None:
    """Workbench, flat white, neutral gray. No glass, no cavity, no lighting."""
    import bpy

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "FLAT"
    shading.color_type = "SINGLE"
    shading.single_color = WHITE[:3]
    shading.show_shadows = False
    shading.show_specular_highlight = False
    shading.show_cavity = False
    shading.show_object_outline = False
    shading.background_type = "WORLD"
    scene.display.render_aa = "FXAA"
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "Standard"
    world = bpy.data.worlds.new("MatteWorld")
    world.use_nodes = False
    world.color = GRAY[:3]
    scene.world = world
