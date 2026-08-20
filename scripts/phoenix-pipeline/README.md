# Phoenix asset pipeline

Validate, render, measure and gate a candidate Phoenix GLB before any material
or cinematic work. Nothing here modifies the input asset.

```bash
scripts/phoenix-pipeline/run.sh --glb path/to/phoenix.glb --label v1 [--deploy]
```

Options: `--orient -y|+y|+x|-x` (facing axis), `--up z|y`, `--landmarks
landmarks.json` (close-up framing overrides), `--visual visual.json` (human
sign-off), `--out DIR`, `--deploy` (publish to Cloudflare Pages).

Blender is found via `$BLENDER`, then `PATH`, then downloaded to `/tmp/blender`.

## Stages

| File                     | Runs in | Does                                                                                                                |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `validate_asset.py`      | Blender | inventory, counts, bbox, islands, local thickness, wing plane orientation, relief-plate verdict → `validation.json` |
| `render_silhouettes.py`  | Blender | matte white gate renders + landmark detection → `render.json`                                                       |
| `measure_silhouettes.py` | python3 | pixel metrics: fills, solidity, ribbon score, mobile ceiling, feather profile → `metrics.json`                      |
| `gate.py`                | python3 | strict gate, measured + advisory + visual → `gate.json`                                                             |
| `build_gallery.py`       | python3 | public QA `index.html`                                                                                              |
| `pipeline_common.py`     | both    | frozen camera rig, orientation normalisation, matte scene                                                           |

## Rules baked into the tools

- **Cameras are frozen** in `pipeline_common.CANONICAL_VIEWS`. Assets get
  rotated into the canonical frame; views are never re-aimed to make an asset
  pass. Editing those five vectors invalidates every past comparison.
- **Matte white only**: Workbench, flat shading, single white colour, neutral
  gray world. No lighting, cavity, outline, shadows, glass or post-processing.
- **Local thickness, not bounding boxes.** A relief emblem reports healthy
  global depth while every part of it is a plate; the validator measures the
  depth inside each cell of the front view instead.
- **Advisory metrics cannot fail an asset.** Outline lobe counts resolve gross
  masses, not individual feathers, so they inform rather than decide.
- **Status is never PASS with unverified visual checks.** Identity is judged by
  eye, recorded in a visual file, and only then does the gate allow glass.

## Reference fixture

`assets/reference/phoenix-reference-rejected.glb` is the Phase 14 emblem, kept as
a regression fixture. Running the pipeline on it must keep reporting
`relief plate YES`, wings in the picture plane, and `STATUS FAIL`. If a change
to the validator ever lets that asset through, the change is wrong.
