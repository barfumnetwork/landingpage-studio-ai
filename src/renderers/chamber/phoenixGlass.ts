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
  float fres = pow(1.0 - ndv, 2.35);
  float fresHard = pow(1.0 - ndv, 5.4);

  vec3 L = normalize(uKeyDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 86.0);
  float specBroad = pow(max(dot(N, H), 0.0), 16.0);
  float wrap = pow(clamp(dot(N, L) * 0.55 + 0.45, 0.0, 1.0), 1.25);

  vec3 L2 = normalize(uFillDir);
  float fill = pow(max(dot(N, L2), 0.0), 1.1);

  float inner =
    0.5 +
    0.5 * sin(vWorldPos.x * 7.4 + vWorldPos.z * 5.1) *
      sin(vWorldPos.y * 9.2 + vWorldPos.x * 3.3);

  vec3 iri = vec3(
    0.72 + 0.28 * sin(ndv * 11.0 + 0.2),
    0.78 + 0.18 * sin(ndv * 8.4 + 1.4),
    0.88 + 0.12 * sin(ndv * 6.2 + 2.2)
  );

  vec3 glass = mix(uAbsorb, uTint, wrap * 0.62 + inner * 0.12);
  vec3 col = glass;
  col += uRim * fres * 1.85;
  col += vec3(1.0, 0.97, 0.9) * spec * 2.15;
  col += uRim * specBroad * 0.42;
  col += vec3(0.42, 0.62, 0.84) * fill * 0.38;
  col += iri * fresHard * uIri;
  col *= uGain;

  float alpha = mix(uOpacity, 0.94, clamp(fres * 1.15, 0.0, 1.0));
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
    uTint: { value: new Color(look.tint ?? 0xd8e2ea) },
    uRim: { value: new Color(look.rim ?? 0xffe6c2) },
    uAbsorb: { value: new Color(look.absorb ?? 0x2a2432) },
    uKeyDir: { value: new Vector3(-0.42, 0.84, 0.38).normalize() },
    uFillDir: { value: new Vector3(0.62, 0.18, -0.42).normalize() },
    uOpacity: { value: look.opacity ?? 0.4 },
    uIri: { value: look.iri ?? 0.14 },
    uGain: { value: look.gain ?? 1.12 },
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
