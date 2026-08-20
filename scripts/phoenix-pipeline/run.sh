#!/usr/bin/env bash
# Phoenix asset pipeline: validate -> render -> measure -> gate -> gallery -> publish.
#
#   scripts/phoenix-pipeline/run.sh --glb path/to/phoenix.glb \
#       [--label my-asset] [--orient -y|+y|+x|-x] [--up z|y] \
#       [--landmarks landmarks.json] [--visual visual.json] [--deploy]
#
# Nothing in here writes to the input GLB. --deploy needs CLOUDFLARE_API_TOKEN
# and CLOUDFLARE_ACCOUNT_ID and publishes to the phoenix-asset-qa alias.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLB=""
LABEL="candidate"
ORIENT="-y"
UP="z"
LANDMARKS=""
VISUAL=""
DEPLOY="no"
OUT=""
PROJECT="${PHOENIX_QA_PROJECT:-landingpage-studio-ai}"
ALIAS="${PHOENIX_QA_BRANCH:-phoenix-asset-qa}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --glb) GLB="$2"; shift 2 ;;
    --label) LABEL="$2"; shift 2 ;;
    --orient) ORIENT="$2"; shift 2 ;;
    --up) UP="$2"; shift 2 ;;
    --landmarks) LANDMARKS="$2"; shift 2 ;;
    --visual) VISUAL="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --deploy) DEPLOY="yes"; shift ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [[ -z "$GLB" ]]; then echo "--glb is required" >&2; exit 2; fi
if [[ ! -f "$GLB" ]]; then echo "no such file: $GLB" >&2; exit 2; fi
OUT="${OUT:-/tmp/phoenix-qa/$LABEL}"

# Blender: use BLENDER, then PATH, then a local download.
BLENDER="${BLENDER:-$(command -v blender || true)}"
if [[ -z "$BLENDER" || ! -x "$BLENDER" ]]; then
  BLENDER_VERSION="${BLENDER_VERSION:-4.2.9}"
  BLENDER_DIR="/tmp/blender/blender-${BLENDER_VERSION}-linux-x64"
  if [[ ! -x "$BLENDER_DIR/blender" ]]; then
    echo "==> fetching Blender ${BLENDER_VERSION}"
    mkdir -p /tmp/blender
    MAJOR="${BLENDER_VERSION%.*}"
    curl -fsSL "https://download.blender.org/release/Blender${MAJOR}/blender-${BLENDER_VERSION}-linux-x64.tar.xz" \
      | tar -xJ -C /tmp/blender
  fi
  BLENDER="$BLENDER_DIR/blender"
fi

export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
mkdir -p "$OUT"

echo "==> validating $GLB"
"$BLENDER" --background --python "$HERE/validate_asset.py" -- \
  --glb "$GLB" --out "$OUT" --orient "$ORIENT" --up "$UP" >"$OUT/validate.log" 2>&1 \
  || { tail -30 "$OUT/validate.log"; exit 1; }
grep -E "^(file|vertices|triangles|dimensions|islands|depth|torso|wing|slab|relief|note)" "$OUT/validate.log" || true

echo "==> rendering matte silhouettes"
RENDER_ARGS=(--glb "$GLB" --out "$OUT" --orient "$ORIENT" --up "$UP")
if [[ -n "$LANDMARKS" ]]; then RENDER_ARGS+=(--landmarks "$LANDMARKS"); fi
"$BLENDER" --background --python "$HERE/render_silhouettes.py" -- "${RENDER_ARGS[@]}" \
  >"$OUT/render.log" 2>&1 || { tail -30 "$OUT/render.log"; exit 1; }
grep -E "^rendered" "$OUT/render.log" || true

echo "==> measuring pixels"
python3 "$HERE/measure_silhouettes.py" --dir "$OUT"

echo "==> gate"
GATE_ARGS=(--dir "$OUT" --label "$LABEL")
if [[ -n "$VISUAL" ]]; then GATE_ARGS+=(--visual "$VISUAL"); fi
python3 "$HERE/gate.py" "${GATE_ARGS[@]}" || true

echo "==> gallery"
python3 "$HERE/build_gallery.py" --dir "$OUT" --label "$LABEL"

if [[ "$DEPLOY" == "yes" ]]; then
  echo "==> publishing"
  npx --yes wrangler pages deploy "$OUT" \
    --project-name "$PROJECT" --branch "$ALIAS" --commit-dirty=true
  echo
  echo "Gallery: https://${ALIAS}.${PROJECT}.pages.dev"
  for f in front-34 side-34 flight wings 390 430 head hero-feather tail; do
    echo "  https://${ALIAS}.${PROJECT}.pages.dev/${f}.png"
  done
else
  echo "local gallery: $OUT/index.html  (add --deploy to publish)"
fi
