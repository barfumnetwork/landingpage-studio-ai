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
  WebGLRenderer,
  SRGBColorSpace,
} from 'three';
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
uniform float uScroll;
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

void main() {
  vec2 uv = vUv;
  vec2 delta = uv - uMouse;
  float dist = length(delta);
  float ripple = exp(-dist * 6.4) * uAmp;
  float grain = noise(uv * 18.0 + uTime * 0.15 + uScroll * 4.0) * 0.012;
  float wave = sin(uv.y * 26.0 + uTime * 0.85 + uScroll * 6.0) * 0.004 + sin(uv.x * 17.0 - uTime * 0.5) * 0.003;
  vec2 dir = dist > 0.0001 ? delta / dist : vec2(0.0);
  vec2 vel = uVel * 0.18;
  vec2 warp = dir * ripple * 0.28 + vel * ripple * 0.35 + vec2(wave, -wave * 0.55) + vec2(grain);
  vec2 uvR = clamp(uv + warp * 1.08, 0.0, 1.0);
  vec2 uvG = clamp(uv + warp, 0.0, 1.0);
  vec2 uvB = clamp(uv + warp * 0.9, 0.0, 1.0);
  vec3 base = vec3(0.075, 0.075, 0.08);
  vec3 color = base;
  if (uHasMap > 0.5) {
    color = vec3(
      texture2D(uMap, uvR).r,
      texture2D(uMap, uvG).g,
      texture2D(uMap, uvB).b
    );
  }
  float sheen = pow(max(0.0, 1.0 - dist * 1.8), 3.0) * 0.22 * uAmp;
  color += vec3(0.92, 0.89, 0.82) * sheen;
  float caustic = sin((uv.x * 40.0 + uv.y * 18.0) - uTime * 1.6) * exp(-dist * 8.0) * uAmp * 0.08;
  color += caustic;
  float scan = sin((uv.y + uTime * 0.035) * 210.0) * 0.012;
  color += scan * 0.07;
  if (uHasMap < 0.5) {
    float gx = step(0.978, fract(uv.x * 32.0));
    float gy = step(0.978, fract(uv.y * 18.0));
    color += vec3(0.28, 0.27, 0.24) * (gx + gy) * 0.42;
    color += vec3(0.035, 0.035, 0.04);
  }
  float vignette = smoothstep(1.15, 0.35, dist + 0.25);
  color *= mix(0.86, 1.0, vignette);
  gl_FragColor = vec4(color, 1.0);
}
`;

function startField(node: HTMLDivElement, imageUrl: string | null): () => void {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    node.classList.add(styles.fallback);
    return () => undefined;
  }

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2(0.5, 0.5) },
    uVel: { value: new Vector2(0, 0) },
    uAmp: { value: 0 },
    uScroll: { value: 0 },
    uMap: { value: new Texture() },
    uHasMap: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(geometry, material);
  scene.add(mesh);
  node.appendChild(renderer.domElement);

  let frame = 0;
  let running = true;
  let amp = 0;
  let targetAmp = 0.18;
  let last = performance.now();
  let texture: Texture | null = null;
  const mouse = new Vector2(0.5, 0.5);
  const mouseDamp = new Vector2(0.5, 0.5);
  const vel = new Vector2();

  function resize(): void {
    const width = node.clientWidth || 1;
    const height = node.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    renderer.setSize(width, height, false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(node);
  resize();

  const vis = new IntersectionObserver((entries) => {
    running = entries.some((entry) => entry.isIntersecting);
  });
  vis.observe(node);

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
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    );
    targetAmp = 1;
  }

  function onDown(event: PointerEvent): void {
    const rect = node.getBoundingClientRect();
    mouse.set(
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    );
    targetAmp = 1.7;
  }

  function onLeave(): void {
    targetAmp = 0.22;
  }

  function onScroll(): void {
    uniforms.uScroll.value = node.getBoundingClientRect().top / Math.max(window.innerHeight, 1);
  }

  node.addEventListener('pointermove', onMove, { passive: true });
  node.addEventListener('pointerdown', onDown);
  node.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', onScroll, { passive: true });

  function tick(now: number): void {
    frame = window.requestAnimationFrame(tick);
    if (!running) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    amp += (targetAmp - amp) * 0.06;
    if (targetAmp > 1) targetAmp += (1 - targetAmp) * 0.05;
    vel.copy(mouse).sub(mouseDamp);
    mouseDamp.lerp(mouse, 0.08);
    uniforms.uTime.value += delta;
    uniforms.uMouse.value.copy(mouseDamp);
    uniforms.uVel.value.copy(vel);
    uniforms.uAmp.value = amp;
    renderer.render(scene, camera);
  }

  frame = window.requestAnimationFrame(tick);

  return () => {
    running = false;
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    vis.disconnect();
    node.removeEventListener('pointermove', onMove);
    node.removeEventListener('pointerdown', onDown);
    node.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', onScroll);
    geometry.dispose();
    material.dispose();
    texture?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

interface SignalFieldProps {
  imageUrl: string | null;
}

export default function SignalField({ imageUrl }: SignalFieldProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startField(node, imageUrl);
  }, [imageUrl]);

  return <div ref={hostRef} className={styles.field} aria-hidden="true" />;
}
