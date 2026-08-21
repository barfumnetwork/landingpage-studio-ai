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
  float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), 2.8);
  float fresHard = pow(clamp(1.0 - ndv, 0.0, 1.0), 5.6);

  vec3 L = normalize(uKeyDir);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 140.0);
  float specBroad = pow(max(dot(N, H), 0.0), 36.0);
  float lit = max(dot(N, L), 0.0);

  vec3 L2 = normalize(uFillDir);
  float fill = max(dot(N, L2), 0.0);

  float vein = sin(vWorldPos.x * 4.2 + vWorldPos.z * 3.1) * sin(vWorldPos.y * 6.4);
  float shaft = exp(-pow(vWorldPos.y * 2.4, 2.0));

  vec3 crystal = mix(uAbsorb, uTint, lit * 0.22 + max(vein, 0.0) * 0.04);
  vec3 col = crystal;
  col += uRim * fres * 1.05;
  col += vec3(0.96, 0.9, 0.76) * spec * 1.15;
  col += uRim * specBroad * 0.12;
  col += vec3(0.22, 0.34, 0.4) * fill * 0.1;
  col += vec3(0.5, 0.58, 0.62) * fresHard * uIri;
  col += uRim * shaft * 0.06;
  col *= uGain;

  float alpha = mix(uOpacity, 0.82, clamp(fres * 1.05, 0.0, 1.0));
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
    uTint: { value: new Color(look.tint ?? 0x3a3530) },
    uRim: { value: new Color(look.rim ?? 0xe6cfa5) },
    uAbsorb: { value: new Color(look.absorb ?? 0x0c0a0c) },
    uKeyDir: { value: new Vector3(-0.38, 0.78, 0.5).normalize() },
    uFillDir: { value: new Vector3(0.7, 0.12, -0.35).normalize() },
    uOpacity: { value: look.opacity ?? 0.13 },
    uIri: { value: look.iri ?? 0.08 },
    uGain: { value: look.gain ?? 0.9 },
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
