import {
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from 'three';

const vertexShader = /* glsl */ `
varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
#include <common>
uniform vec3 uTint;
uniform vec3 uRim;
uniform vec3 uAbsorb;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform float uOpacity;
uniform float uIri;
uniform float uGain;

varying vec3 vWorldNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(vViewDir);
  float ndv = abs(dot(N, V));
  float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), 3.4);
  float fresHard = pow(clamp(1.0 - ndv, 0.0, 1.0), 6.2);

  vec3 L = normalize(uKeyDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 110.0);
  float specBroad = pow(max(dot(N, H), 0.0), 28.0) * 0.22;
  float wrap = clamp(dot(N, L) * 0.35 + 0.65, 0.0, 1.0);

  vec3 L2 = normalize(uFillDir);
  float fill = max(dot(N, L2), 0.0);

  float vein = 0.5 + 0.5 * sin(vWorldPos.x * 5.4 + vWorldPos.z * 3.8)
    * sin(vWorldPos.y * 7.1);

  vec3 iri = vec3(0.55, 0.62, 0.78) + vec3(0.12, 0.06, 0.04) * sin(ndv * 9.0);

  vec3 glass = mix(uAbsorb, uTint, 0.18 + wrap * 0.22 + vein * 0.05);
  vec3 col = glass;
  col += uRim * fres * 0.85;
  col += vec3(0.98, 0.93, 0.82) * spec * 0.9;
  col += uRim * specBroad;
  col += vec3(0.28, 0.42, 0.58) * fill * 0.16;
  col += iri * fresHard * uIri;
  col *= uGain;

  float alpha = mix(uOpacity, 0.78, fres);
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export interface GlassLook {
  tint?: number;
  rim?: number;
  absorb?: number;
  opacity?: number;
  iri?: number;
  gain?: number;
  depthWrite?: boolean;
}

export function createGlassMaterial(look: GlassLook = {}): ShaderMaterial {
  const uniforms: Record<string, IUniform> = {
    uTint: { value: new Color(look.tint ?? 0x7c8b99) },
    uRim: { value: new Color(look.rim ?? 0xe8c9a0) },
    uAbsorb: { value: new Color(look.absorb ?? 0x121018) },
    uKeyDir: { value: new Vector3(-0.42, 0.84, 0.38).normalize() },
    uFillDir: { value: new Vector3(0.62, 0.18, -0.42).normalize() },
    uOpacity: { value: look.opacity ?? 0.2 },
    uIri: { value: look.iri ?? 0.1 },
    uGain: { value: look.gain ?? 0.92 },
  };

  return new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: look.depthWrite ?? false,
    side: DoubleSide,
    toneMapped: true,
  });
}
