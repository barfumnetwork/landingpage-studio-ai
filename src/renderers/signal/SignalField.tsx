import { useEffect, useRef } from 'react';
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Texture,
  TextureLoader,
  Vector2,
  SRGBColorSpace,
} from 'three';
import { createRendererRuntime } from '../shared/createRendererRuntime';
import { readScrollProgress } from '../shared/scrollProgress';
import styles from './SignalField.module.css';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uAmp;
uniform float uRipple;
uniform float uScroll;
uniform float uQuality;
uniform sampler2D uMap;
uniform float uHasMap;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = noise(p) * 0.65;
  if (uQuality > 0.5) v += noise(p * 2.12 + 8.1) * 0.35;
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 delta = uv - uMouse;
  float dist = length(delta);
  vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);
  vec2 force = uVel * uAmp;
  float ripple = exp(-dist * 7.2) * uRipple;
  float grain = (fbm(uv * 5.5 + uTime * 0.08 + uScroll * 1.4) - 0.5) * 0.018 * uQuality;
  float caustic = sin((uv.x * 18.0 + uv.y * 11.0) - uTime * 0.55) * exp(-dist * 4.8) * 0.012;
  vec2 warp = force * 0.55 + dir * ripple * 0.16 + vec2(grain, -grain * 0.6) + dir * caustic * 2.4;
  warp *= mix(0.55, 1.0, uQuality);
  float ca = 0.006 * uAmp * uQuality;
  vec2 uvR = clamp(uv + warp + vec2(ca, 0.0), 0.0, 1.0);
  vec2 uvG = clamp(uv + warp, 0.0, 1.0);
  vec2 uvB = clamp(uv + warp - vec2(ca, 0.0), 0.0, 1.0);
  vec3 color = vec3(0.075, 0.075, 0.08);
  if (uHasMap > 0.5) {
    color = vec3(
      texture2D(uMap, uvR).r,
      texture2D(uMap, uvG).g,
      texture2D(uMap, uvB).b
    );
  } else {
    float signedX = uv.x * 28.0;
    float signedY = uv.y * 16.0;
    float gx = 1.0 - smoothstep(0.02, 0.06, abs(fract(signedX) - 0.5));
    float gy = 1.0 - smoothstep(0.02, 0.06, abs(fract(signedY) - 0.5));
    color += vec3(0.22, 0.21, 0.19) * (gx + gy) * 0.22;
    color += vec3(0.03, 0.03, 0.034);
    color += caustic * 0.35;
  }
  float sheen = pow(max(0.0, 1.0 - dist * 1.6), 3.0) * 0.16 * uAmp;
  color += vec3(0.9, 0.87, 0.8) * sheen;
  float vignette = smoothstep(1.2, 0.38, dist + 0.22);
  color *= mix(0.88, 1.0, vignette);
  gl_FragColor = vec4(color, 1.0);
}
`;

function startField(
  node: HTMLDivElement,
  imageUrl: string | null,
  compact: boolean,
): () => void {
  const mobile = window.matchMedia('(max-width: 720px)').matches;
  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: false,
    alpha: false,
    depth: false,
    desktopDpr: compact ? 1 : 1.4,
    mobileDpr: compact ? 1 : 1.1,
    compact,
    toneMapping: 'none',
  });
  if (!runtime) return () => undefined;
  const gl = runtime;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uVel: { value: new Vector2(0, 0) },
    uAmp: { value: 0.12 },
    uRipple: { value: 0 },
    uScroll: { value: 0 },
    uQuality: { value: compact ? 0.62 : mobile ? 0.38 : 1 },
    uMap: { value: new Texture() },
    uHasMap: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  scene.add(new Mesh(geometry, material));
  gl.track(geometry);
  gl.track(material);

  let frame = 0;
  let last = performance.now();
  let texture: Texture | null = null;
  const mouse = new Vector2(0.5, 0.5);
  const mouseDamp = new Vector2(0.5, 0.5);
  const vel = new Vector2();
  const force = new Vector2();
  let amp = 0.12;
  let ripple = 0;

  if (imageUrl) {
    const loader = new TextureLoader();
    loader.load(imageUrl, (map) => {
      texture = map;
      map.colorSpace = SRGBColorSpace;
      uniforms.uMap.value = map;
      uniforms.uHasMap.value = 1;
    });
  }

  function onMove(event: PointerEvent): void {
    const rect = node.getBoundingClientRect();
    mouse.set(
      (event.clientX - rect.left) / Math.max(rect.width, 1),
      1 - (event.clientY - rect.top) / Math.max(rect.height, 1),
    );
  }

  function onDown(event: PointerEvent): void {
    onMove(event);
    ripple = 1;
  }

  node.addEventListener('pointermove', onMove, { passive: true });
  node.addEventListener('pointerdown', onDown);

  function tick(now: number): void {
    frame = window.requestAnimationFrame(tick);
    if (!gl.isRunning()) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    vel.copy(mouse).sub(mouseDamp);
    mouseDamp.lerp(mouse, 0.1);
    force.lerp(vel, 0.18);
    force.multiplyScalar(Math.exp(-2.4 * delta));
    const speed = Math.min(Math.hypot(force.x, force.y) * 7.4, 0.35);
    amp += (speed - amp) * 0.08;
    amp *= Math.exp(-0.35 * delta);
    amp = Math.min(Math.max(amp, 0.06), 0.35);
    ripple *= Math.exp(-3.2 * delta);
    uniforms.uTime.value += delta;
    uniforms.uMouse.value.copy(mouseDamp);
    uniforms.uVel.value.copy(force);
    uniforms.uAmp.value = amp;
    uniforms.uRipple.value = ripple;
    uniforms.uScroll.value = compact ? 0 : readScrollProgress(node);
    gl.renderer.render(scene, camera);
  }

  frame = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(frame);
    node.removeEventListener('pointermove', onMove);
    node.removeEventListener('pointerdown', onDown);
    texture?.dispose();
    gl.dispose();
  };
}

interface SignalFieldProps {
  imageUrl: string | null;
  compact?: boolean;
}

export default function SignalField({ imageUrl, compact = false }: SignalFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startField(node, imageUrl, compact);
  }, [imageUrl, compact]);

  return (
    <div
      ref={hostRef}
      className={`${styles.field} ${compact ? styles.compact : ''}`}
      aria-hidden="true"
    />
  );
}
