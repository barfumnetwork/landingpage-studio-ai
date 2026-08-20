# Phoenix hero asset — delivery spec

The Phase 14 asset (`assets/reference/phoenix-reference-rejected.glb`) was rejected
because it is a 2.5D relief emblem. It is kept as **REFERENCE_ASSET** only: a
silhouette reference and a regression fixture for the validator. It must never
ship as the production Phoenix.

This document is what a replacement asset has to satisfy. Everything here is
checked by `scripts/phoenix-pipeline/run.sh` before any material, glass,
lighting or camera work begins.

## Why the last asset failed

Measured on the frozen reference, by the validator:

| Metric                              | Reference | Required |
| ----------------------------------- | --------- | -------- |
| torso local thickness / torso width | 0.198     | >= 0.30  |
| wing plate normal along depth axis  | 0.997     | <= 0.70  |
| side 3/4 median mask width / height | 0.305     | >= 0.22  |
| 90 degree profile width / height    | 0.170     | >= 0.20  |
| widest reachable 390 height         | 58%       | >= 60%   |
| floating islands                    | 5         | 0        |

The two decisive numbers are the first two. _Local_ thickness matters, not the
global bounding box: the reference reports a healthy 0.40 depth-over-height only
because a wing root sits in front of a tail plume, while every individual part
of the body is a 5 cm plate. And the wing surfaces lie in the picture plane, so
they are edge-on lines from any side camera.

## Format

- **GLB** (glTF 2.0 binary), single file, one scene.
- Any orientation is fine if you declare it: the pipeline takes `--orient` for
  the facing axis (`-y` default, also `+y`, `+x`, `-x`) and `--up` (`z` default,
  or `y`). The asset is rotated into the canonical frame; the cameras never move.
- Roughly 2 units tall, real-world scale, transforms may be baked or not.
- Textures, materials and animation are **not** required for the gate. The gate
  is matte white. Ship geometry first.
- Optional `landmarks.json` alongside the GLB, if auto-detection frames the
  close-ups badly:

```json
{
  "head": { "center": [0.0, -0.1, 0.62], "radius": 0.26 },
  "hero_feather": { "center": [-0.82, 0.05, 0.55], "radius": 0.22 },
  "tail": { "center": [0.1, 0.0, -0.55], "radius": 0.5 }
}
```

## Geometry budget

- **50,000–150,000 triangles** for the hero. Up to 400,000 is accepted if the
  density is anatomical.
- Do not inflate the count. The validator reports triangles next to the
  volumetric measurements; a high count with a plate torso still fails.
- Watertight enough that nothing floats: every island must touch the body
  (gap under 0.5% of the bounding box diagonal).

## Body

- Real torso with a **ribcage mass**: local thickness at the chest at least 0.30
  of the torso width, ideally 0.45–0.75.
- Chest depth readable in profile; the outline must go head → neck → chest →
  torso → tail root with visible changes of section.
- Shoulder volume that visibly emerges from the torso.
- Neck as a tube with volume, not a flat join.
- Head with a skull volume and a **beak** that reads in silhouette from front
  3/4 and from the side.
- Coherent topology: one connected body shell, no interpenetrating slabs.

## Wings

- Real 3D wing roots that merge into the shoulder mass.
- **The wing chord must run front to back.** A spread wing is a thin surface,
  which is correct, but its thin direction must point up, not at the camera.
  Validator: wing plate normal dot depth axis <= 0.70.
- Both wings must survive front 3/4 **and** side 3/4. They do not need to be
  mathematically symmetrical, only visually balanced.
- Individually readable primaries: 6–12 per wing, separated by real negative
  space in the outline, not by shading.
- No flat emblem plates, no paddle shapes, no fused feather fans.

## Feathers

Hero primaries (at least the 4–6 outermost per wing) each need:

- a **shaft / rachis** with its own thickness,
- a **vane**, asymmetric across the shaft (leading vane narrower),
- a **tapered tip**.

The test is a matte white close-up: the width profile along the feather must go
narrow calamus → wide vane belly → tapered tip. A cone fails. A paddle fails. A
shard fails.

## Tail

- **6–12 individually modelled tail feathers**, each with shaft, vane and tip.
- Connected at a believable tail root that continues the body mass.
- Visible volume: the tail must not be a bundle of zero-thickness ribbons.

## Pose

- Upright ascending or spread-wing flight, either is fine.
- Keep the projected front 3/4 silhouette **taller than it is wide**, or at
  least no wider than about 1.1x its height. The reference fails the mobile
  gate for a purely geometric reason: at 390 px wide it can never exceed ~58%
  of an 844 px frame, and the 55–70% band needs headroom. A pose whose wings
  span far more than its height cannot be framed on a phone.

## Acceptance

```bash
scripts/phoenix-pipeline/run.sh --glb path/to/phoenix.glb --label v1 --deploy
```

That validates, renders the matte white gate views, measures the pixels, runs
the gate and publishes the public QA gallery. Required renders:

`front-34` `side-34` `flight` `wings` `390` `430` `head` `hero-feather` `tail`
plus `profile`, `390-flight`, `390-wings`, `430-flight` as supporting evidence.

The gate has three kinds of check:

- **measured** — geometry and pixels. These can fail an asset on their own.
- **advisory** — reported, never decisive (for example gross outline lobe counts,
  which cannot resolve individual feathers).
- **visual** — identity questions no script can answer honestly: 3-second
  recognition, beak, "both wings belong to the same body", "tail reads as
  feathers". These start UNVERIFIED.

**Status can never be PASS while any visual check is unverified.** Sign them off
by inspecting the published renders and writing a visual file:

```json
{
  "recognition": "pass",
  "front_34": "pass",
  "side_34_visual": "pass",
  "head": "pass",
  "beak": "pass",
  "neck": "pass",
  "chest": "pass",
  "torso": "pass",
  "shoulder": "pass",
  "wing_left": "pass",
  "wing_right": "pass",
  "wings_same_body": "pass",
  "primaries": "pass",
  "no_plate_look": "pass",
  "tail_feathers": "pass",
  "hero_feather_visual": "pass"
}
```

```bash
scripts/phoenix-pipeline/run.sh --glb phoenix.glb --visual visual.json --deploy
```

## Glass

No glass, transmission, fresnel, bloom, HDRI, dramatic lighting,
post-processing, environment or particles until the gate reports PASS. The
silhouette has to stand up on its own in matte white first.
