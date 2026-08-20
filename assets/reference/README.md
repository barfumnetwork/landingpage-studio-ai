# REFERENCE_ASSET — do not ship

`phoenix-reference-rejected.glb`

- Source: user upload `New_Project_2082026.glb`, Phase 14E.
- sha256: `63c05f37d9ac065931cbad1e04c61cb0c24443352e45dd0a9f80922fedbceff7`
- 103,432 vertices / 207,056 triangles / 1.96 x 0.70 x 1.72.

**Rejected in Phase 14G.** It is a 2.5D relief emblem, not a volumetric
creature: torso local thickness is 0.198 of the torso width (a ribcage needs

> = 0.30) and the wing surfaces lie in the picture plane (plate normal 0.997
> along the depth axis), so both wings go edge-on in any side view.

Kept for two reasons only:

1. **Silhouette reference.** Its front 3/4 is a genuinely good phoenix outline —
   use it as art direction for the replacement.
2. **Regression fixture.** `scripts/phoenix-pipeline/run.sh` must keep failing
   this file. If a validator change ever lets it pass, the change is wrong.

Never use it as the production Phoenix. See `docs/PHOENIX_ASSET_SPEC.md`.
