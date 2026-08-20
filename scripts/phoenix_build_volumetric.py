"""Build a genuinely volumetric phoenix as a GLB.

  blender --background --python phoenix_build_volumetric.py -- --out DIR

Everything is a lofted solid with real cross-sections: the body is one closed
shell from tail root to skull, the wing arms are airfoil sections whose chord
runs front to back, and every primary, secondary, covert, tail and crest
feather is an individual solid with a rachis ridge, an asymmetric vane and a
tapered tip.

Frame: Z up, facing -Y, which is what the asset pipeline expects.

Two rules drive the proportions, both learned from the rejected emblem:
  1. the wing surface must not face the camera (its plate normal has to stay
     under 0.70 along the depth axis) or the wings vanish edge-on from the side;
  2. the front 3/4 projection has to stay narrower than about 0.77 of its
     height or the 55-70% mobile height band is unreachable. That rules out a
     full eagle wingspan and asks for a rising pose with the wings swept up.
"""

from __future__ import annotations

import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------- curve helpers


def catmull(points: list[Vector], samples: int) -> list[Vector]:
    """Catmull-Rom through the control points, endpoints duplicated."""
    pts = [points[0]] + list(points) + [points[-1]]
    out: list[Vector] = []
    segments = len(pts) - 3
    for i in range(samples):
        u = i / (samples - 1) * segments
        seg = min(segments - 1, int(u))
        t = u - seg
        p0, p1, p2, p3 = pts[seg], pts[seg + 1], pts[seg + 2], pts[seg + 3]
        t2, t3 = t * t, t * t * t
        out.append(
            0.5
            * (
                (2 * p1)
                + (-p0 + p2) * t
                + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            )
        )
    return out


def lerp_series(values: list[float], samples: int) -> list[float]:
    """Smooth 1D interpolation of per-control values, matching catmull()."""
    vectors = [Vector((v, 0.0, 0.0)) for v in values]
    return [v.x for v in catmull(vectors, samples)]


def frames_along(curve: list[Vector], hint: Vector) -> list[tuple[Vector, Vector, Vector]]:
    """Tangent / side / up frame at each sample, kept from flipping."""
    out = []
    up = hint.normalized()
    for i, p in enumerate(curve):
        nxt = curve[min(len(curve) - 1, i + 1)]
        prv = curve[max(0, i - 1)]
        tangent = (nxt - prv)
        if tangent.length < 1e-9:
            tangent = Vector((0.0, 0.0, 1.0))
        tangent.normalize()
        side = tangent.cross(up)
        if side.length < 1e-6:
            side = tangent.cross(Vector((1.0, 0.0, 0.0)))
        side.normalize()
        local_up = side.cross(tangent).normalized()
        out.append((tangent, side, local_up))
        up = local_up
    return out


# ---------------------------------------------------------------- mesh builder


class Builder:
    def __init__(self) -> None:
        self.bm = bmesh.new()

    def loft(self, rings: list[list[Vector]], cap_start: bool = True, cap_end: bool = True) -> None:
        vert_rings = [[self.bm.verts.new(p) for p in ring] for ring in rings]
        for a, b in zip(vert_rings, vert_rings[1:]):
            n = len(a)
            for i in range(n):
                j = (i + 1) % n
                try:
                    self.bm.faces.new((a[i], a[j], b[j], b[i]))
                except ValueError:
                    pass
        if cap_start and len(vert_rings[0]) > 2:
            try:
                self.bm.faces.new(list(reversed(vert_rings[0])))
            except ValueError:
                pass
        if cap_end and len(vert_rings[-1]) > 2:
            try:
                self.bm.faces.new(vert_rings[-1])
            except ValueError:
                pass

    def to_object(self, name: str) -> bpy.types.Object:
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        mesh = bpy.data.meshes.new(f"{name}Mesh")
        self.bm.to_mesh(mesh)
        self.bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = True
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        return obj


def ellipse_ring(
    center: Vector,
    axis_a: Vector,
    axis_b: Vector,
    radius_a: float,
    radius_b: float,
    count: int,
    flatten_back: float = 0.0,
) -> list[Vector]:
    ring = []
    for i in range(count):
        theta = 2.0 * math.pi * i / count
        ca, sa = math.cos(theta), math.sin(theta)
        # flatten_back pulls the +axis_b side in, giving a keeled chest and a
        # flatter back rather than a plain tube.
        squash = 1.0 - flatten_back * max(0.0, sa)
        ring.append(center + axis_a * (radius_a * ca) + axis_b * (radius_b * sa * squash))
    return ring


# ---------------------------------------------------------------- feather


def feather_rings(
    root: Vector,
    span: Vector,
    normal: Vector,
    length: float,
    width: float,
    sections: int = 30,
    across: int = 10,
    calamus: float = 0.20,
    lead_ratio: float = 0.30,
    camber: float = 0.10,
    sweep: float = 0.12,
    barbs: int = 7,
) -> list[list[Vector]]:
    """One feather: bare calamus, asymmetric vane, barbed trailing edge, tip.

    Cross sections are lens shaped with the thickness peaking on the rachis, so
    the feather is a solid with a visible spine when seen edge on, and a proper
    feather outline when seen on the vane.
    """
    span = span.normalized()
    normal = (normal - span * normal.dot(span))
    if normal.length < 1e-6:
        normal = span.cross(Vector((0.0, 0.0, 1.0)))
    normal.normalize()
    chord = normal.cross(span).normalized()

    def shape(t: float) -> float:
        # Fuller vane with a blunt tip. A needle-sharp taper reads as a thorn
        # at silhouette scale, which is the whole thing we are trying to avoid.
        if t < calamus:
            return 0.085
        s = (t - calamus) / (1.0 - calamus)
        return max(0.05, math.sin(math.pi * (s ** 0.62)) ** 0.72)

    def barb(t: float) -> float:
        if t < calamus + 0.04:
            return 1.0
        return 1.0 - 0.05 * (0.5 - 0.5 * math.cos((t - calamus) * barbs * 2.0 * math.pi))

    def across_at(t: float, j: float) -> float:
        w = width * shape(t)
        return w * lead_ratio * j if j < 0.0 else w * j * barb(t)

    def thick_at(t: float, j: float) -> float:
        rachis = width * (0.40 if t < calamus else 0.28) * (1.0 - t * 0.70)
        return rachis * max(0.05, (1.0 - abs(j)) ** 2.2)

    js = [-1.0 + 2.0 * k / (across - 1) for k in range(across)]
    rings: list[list[Vector]] = []
    for i in range(sections):
        t = i / (sections - 1)
        base = (
            root
            + span * (length * t)
            + normal * (camber * length * t * t)
            + chord * (sweep * length * t * t)
        )
        ring = [base + chord * across_at(t, j) + normal * thick_at(t, j) for j in js]
        ring += [base + chord * across_at(t, j) - normal * thick_at(t, j) for j in reversed(js[1:-1])]
        rings.append(ring)
    return rings


# ---------------------------------------------------------------- anatomy


BODY_SPINE = [
    Vector((0.0, 0.150, -0.360)),  # tail root
    Vector((0.0, 0.090, -0.190)),  # hips
    Vector((0.0, 0.010, -0.020)),  # belly
    Vector((0.0, -0.045, 0.150)),  # ribcage
    Vector((0.0, -0.060, 0.300)),  # breast
    Vector((0.0, -0.035, 0.415)),  # shoulders
    Vector((0.0, -0.075, 0.530)),  # neck base
    Vector((0.0, -0.175, 0.640)),  # neck
    Vector((0.0, -0.250, 0.740)),  # nape
    Vector((0.0, -0.285, 0.845)),  # skull
    Vector((0.0, -0.262, 0.915)),  # crown
]
BODY_WIDTH = [0.055, 0.160, 0.205, 0.235, 0.235, 0.205, 0.148, 0.110, 0.108, 0.178, 0.115]
BODY_DEPTH = [0.070, 0.190, 0.265, 0.300, 0.300, 0.245, 0.175, 0.125, 0.120, 0.205, 0.130]
BODY_FLATTEN = [0.0, 0.10, 0.16, 0.18, 0.12, 0.05, 0.0, 0.0, 0.0, 0.0, 0.0]

BEAK_SPINE = [
    Vector((0.0, -0.380, 0.870)),
    Vector((0.0, -0.500, 0.856)),
    Vector((0.0, -0.600, 0.812)),
    Vector((0.0, -0.632, 0.726)),
]
BEAK_WIDTH = [0.082, 0.058, 0.034, 0.005]
BEAK_DEPTH = [0.098, 0.078, 0.050, 0.008]

SHOULDER = Vector((0.150, -0.030, 0.400))
WING_SPINE_LOCAL = [
    Vector((0.0, 0.0, 0.0)),
    Vector((0.170, 0.060, 0.185)),  # elbow, swept back
    Vector((0.330, 0.010, 0.395)),  # wrist
    Vector((0.395, -0.060, 0.560)),  # hand
]
WING_CHORD = [0.470, 0.430, 0.300, 0.165]
WING_THICK = [0.130, 0.100, 0.066, 0.034]
WING_TWIST = math.radians(33.0)

TAIL_ROOT = Vector((0.0, 0.130, -0.330))


def wing_frame(side: int) -> tuple[Vector, Vector, Vector, Vector]:
    """Span / chord / normal / trailing for a wing raised into a rising V.

    The chord stays on the depth axis and the surface is pronated by 33 degrees:
    enough that the wing plane reads from a front camera, little enough that its
    plate normal stays clear of the 0.70 depth limit.

    The pronation direction is chosen per wing by asking which of the two
    rotations tilts the surface towards the front, rather than mirroring the
    angle. Mirroring is what turned one wing into an edge-on sabre blade: the
    span-cross-chord frame flips handedness between sides, so the same signed
    angle pronates one wing forwards and the other one backwards.
    """
    span = Vector((side * 0.645, 0.0, 0.762)).normalized()
    trailing = Vector((0.0, 1.0, 0.0))
    trailing = (trailing - span * trailing.dot(span)).normalized()
    flat_normal = span.cross(trailing).normalized()
    if flat_normal.z < 0.0:
        flat_normal = -flat_normal
    candidates = [
        (Matrix.Rotation(angle, 4, span) @ flat_normal).normalized()
        for angle in (WING_TWIST, -WING_TWIST)
    ]
    normal = min(candidates, key=lambda n: n.y)
    chord = -(trailing - normal * trailing.dot(normal)).normalized()
    return span, chord, normal, trailing


def build_body(builder: Builder) -> None:
    samples = 120
    curve = catmull(BODY_SPINE, samples)
    widths = lerp_series(BODY_WIDTH, samples)
    depths = lerp_series(BODY_DEPTH, samples)
    flatten = lerp_series(BODY_FLATTEN, samples)
    rings = []
    for p, w, d, f in zip(curve, widths, depths, flatten):
        rings.append(
            ellipse_ring(
                p,
                Vector((1.0, 0.0, 0.0)),
                Vector((0.0, 1.0, 0.0)),
                max(0.004, w),
                max(0.004, d),
                44,
                flatten_back=max(0.0, f),
            )
        )
    builder.loft(rings)


def build_beak(builder: Builder) -> None:
    samples = 26
    curve = catmull(BEAK_SPINE, samples)
    widths = lerp_series(BEAK_WIDTH, samples)
    depths = lerp_series(BEAK_DEPTH, samples)
    rings = [
        ellipse_ring(p, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), max(0.004, w), max(0.004, d), 20)
        for p, w, d in zip(curve, widths, depths)
    ]
    builder.loft(rings)


def build_wing_arm(builder: Builder, side: int) -> list[Vector]:
    span, chord, normal, _trailing = wing_frame(side)
    control = []
    for local in WING_SPINE_LOCAL:
        control.append(SHOULDER * Vector((side, 1.0, 1.0)) + Vector((local.x * side, local.y, local.z)))
    samples = 46
    curve = catmull(control, samples)
    chords = lerp_series(WING_CHORD, samples)
    thicks = lerp_series(WING_THICK, samples)
    rings = []
    for i, (p, c, t) in enumerate(zip(curve, chords, thicks)):
        u = i / (samples - 1)
        # Shift the section so the leading edge stays ahead of the arm line.
        center = p + chord * (c * 0.10)
        rings.append(
            ellipse_ring(center, chord, normal, max(0.006, c * 0.5), max(0.005, t * 0.5), 26, flatten_back=0.18)
        )
    builder.loft(rings)
    return curve


def add_feather(builder: Builder, **kwargs) -> None:
    builder.loft(feather_rings(**kwargs), cap_start=True, cap_end=True)


def build_wing_feathers(builder: Builder, side: int, arm: list[Vector]) -> dict:
    span, _chord, normal, trailing = wing_frame(side)
    hero: dict = {}

    def at(u: float) -> Vector:
        return arm[min(len(arm) - 1, max(0, int(u * (len(arm) - 1))))]

    # Primaries fan across the whole wing plane, from trailing-back at the
    # wrist to straight out along the span at the tip, so the outline gets
    # separate fingers instead of one sabre blade. The outermost is the hero:
    # longer and set further apart so it reads on its own in a close-up.
    primaries = 10
    for i in range(primaries):
        t = i / (primaries - 1)
        hero_feather = i == primaries - 1
        angle = math.radians(96.0 - 88.0 * (t ** 1.25) - (24.0 if hero_feather else 0.0))
        direction = (span * math.cos(angle) + trailing * math.sin(angle)).normalized()
        root = at(0.60 + 0.38 * t) - direction * 0.105
        # Graduated tip: the lead primary runs long and its inboard neighbour is
        # cut back, so the lead feather stands clear of the fan instead of being
        # buried in it.
        graduate = 1.30 if hero_feather else (0.80 if i == primaries - 2 else 1.0)
        length = (0.36 + 0.30 * (t ** 1.2)) * graduate
        width = 0.152 - 0.030 * t
        add_feather(
            builder,
            root=root,
            span=direction,
            normal=normal,
            length=length,
            width=width,
            sections=32,
            across=10,
            camber=0.10 + 0.05 * t,
            sweep=0.10,
        )
        if hero_feather and side < 0:
            hero = {
                "center": list(root + direction * (length * 0.56)),
                "radius": length * 0.44,
                "tip": list(root + direction * length),
            }

    # Secondaries along the forearm, trailing back and down.
    secondaries = 9
    for i in range(secondaries):
        t = i / (secondaries - 1)
        angle = math.radians(120.0 - 26.0 * t)
        direction = (span * math.cos(angle) + trailing * math.sin(angle)).normalized()
        root = at(0.20 + 0.42 * t) - direction * 0.10
        add_feather(
            builder,
            root=root,
            span=direction,
            normal=normal,
            length=0.34 + 0.08 * t,
            width=0.140,
            sections=26,
            across=10,
            camber=0.13,
            sweep=0.08,
        )

    # Coverts: short overlapping row that thickens the wing outline.
    coverts = 8
    for i in range(coverts):
        t = i / (coverts - 1)
        angle = math.radians(112.0 - 46.0 * t)
        direction = (span * math.cos(angle) + trailing * math.sin(angle)).normalized()
        root = at(0.12 + 0.50 * t) - direction * 0.06
        add_feather(
            builder,
            root=root,
            span=direction,
            normal=normal,
            length=0.18 + 0.06 * t,
            width=0.115,
            sections=18,
            across=8,
            camber=0.16,
            sweep=0.06,
            barbs=5,
        )
    return hero


def build_tail(builder: Builder) -> dict:
    """Nine plumes streaming down and back.

    The backward sweep is what gives the 90 degree profile its width: a tail
    that only hangs straight down leaves the profile a narrow strip no matter
    how solid the body is.
    """
    count = 9
    centre = None
    for i in range(count):
        t = (i - (count - 1) * 0.5) / ((count - 1) * 0.5)  # -1 .. 1
        azimuth = math.radians(60.0 * t)
        # Alternating pitch splays the plumes apart so the outline shows gaps
        # between them instead of one fused bundle.
        pitch = 0.40 + 0.50 * abs(t) + (0.26 if i % 2 else -0.10)
        direction = Matrix.Rotation(azimuth, 4, Vector((0.0, 0.0, 1.0))) @ Vector((0.0, pitch, -1.0))
        direction.normalize()
        normal = Matrix.Rotation(azimuth, 4, Vector((0.0, 0.0, 1.0))) @ Vector((0.0, -1.0, 0.0))
        length = (1.02 - 0.30 * abs(t) ** 1.4) * (0.84 if i % 2 else 1.0)
        width = 0.132 - 0.026 * abs(t)
        root = TAIL_ROOT + Vector((0.090 * t, 0.06 * abs(t) - 0.06 + (0.035 if i % 2 else -0.02), 0.04))
        add_feather(
            builder,
            root=root,
            span=direction,
            normal=normal,
            length=length,
            width=width,
            sections=44,
            across=12,
            calamus=0.14,
            camber=0.10,
            sweep=0.24,
            barbs=12,
        )
        if i == count // 2:
            centre = root + direction * (length * 0.5)
    return {"center": list(centre or TAIL_ROOT), "radius": 0.62}


def build_crest(builder: Builder) -> None:
    count = 5
    for i in range(count):
        t = i / (count - 1)
        base = Vector((0.0, -0.240 + 0.055 * t, 0.945 - 0.065 * t))
        direction = Vector((0.0, 0.30 + 0.42 * t, 1.0 - 0.30 * t))
        direction.normalize()
        normal = Vector((0.30 if i % 2 else -0.30, -1.0, 0.0)).normalized()
        add_feather(
            builder,
            root=base,
            span=direction,
            normal=normal,
            length=0.26 + 0.10 * (1.0 - abs(t - 0.35)),
            width=0.060,
            sections=20,
            across=8,
            calamus=0.24,
            camber=0.22,
            sweep=0.05,
            barbs=6,
        )


def build_leg(builder: Builder, side: int) -> None:
    hip = Vector((side * 0.105, 0.010, -0.180))
    control = [
        hip,
        hip + Vector((side * 0.020, -0.070, -0.110)),
        hip + Vector((side * 0.010, -0.150, -0.190)),
        hip + Vector((side * 0.005, -0.185, -0.235)),
    ]
    samples = 22
    curve = catmull(control, samples)
    radii = lerp_series([0.055, 0.040, 0.026, 0.020], samples)
    rings = [
        ellipse_ring(p, Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), max(0.005, r), max(0.005, r * 1.05), 16)
        for p, r in zip(curve, radii)
    ]
    builder.loft(rings)

    ankle = curve[-1]
    for k in range(3):
        spread = math.radians(-32.0 + 32.0 * k)
        direction = Matrix.Rotation(spread, 4, Vector((0.0, 0.0, 1.0))) @ Vector((0.0, -0.75, -0.66))
        direction.normalize()
        claw = [
            ankle,
            ankle + direction * 0.055 + Vector((0.0, 0.0, -0.010)),
            ankle + direction * 0.095 + Vector((0.0, 0.0, -0.038)),
        ]
        samples_c = 12
        curve_c = catmull(claw, samples_c)
        radii_c = lerp_series([0.020, 0.013, 0.004], samples_c)
        rings_c = [
            ellipse_ring(p, Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), max(0.003, r), max(0.003, r), 10)
            for p, r in zip(curve_c, radii_c)
        ]
        builder.loft(rings_c)


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    out = "/tmp/phoenix-build"
    for i, token in enumerate(argv):
        if token == "--out" and i + 1 < len(argv):
            out = argv[i + 1]
    os.makedirs(out, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)

    builder = Builder()
    build_body(builder)
    build_beak(builder)
    build_crest(builder)
    hero: dict = {}
    for side in (-1, 1):
        arm = build_wing_arm(builder, side)
        found = build_wing_feathers(builder, side, arm)
        hero = found or hero
        build_leg(builder, side)
    tail = build_tail(builder)
    obj = builder.to_object("Phoenix")

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    mesh = obj.data
    tris = sum(max(0, len(p.vertices) - 2) for p in mesh.polygons)
    print(
        f"built verts={len(mesh.vertices)} faces={len(mesh.polygons)} tris={tris} "
        f"dim={tuple(round(v, 3) for v in obj.dimensions)}",
        file=sys.stderr,
    )

    glb = os.path.join(out, "phoenix-volumetric-v1.glb")
    bpy.ops.export_scene.gltf(
        filepath=glb,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="NONE",
        export_normals=True,
    )
    with open(os.path.join(out, "landmarks.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "head": {"center": [0.0, -0.290, 0.855], "radius": 0.30},
                "hero_feather": hero or {"center": [-0.55, 0.0, 0.75], "radius": 0.3},
                "tail": tail,
            },
            handle,
            indent=2,
        )
    print(f"wrote {glb}", file=sys.stderr)


if __name__ == "__main__":
    main()
