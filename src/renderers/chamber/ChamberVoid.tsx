import { useEffect, useRef } from 'react';
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TetrahedronGeometry,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  VideoTexture,
  WebGLRenderTarget,
} from 'three';
import { mulberry32 } from '../../generator/mapping/assetHelpers';
import {
  createRendererRuntime,
  createStudioEnvironment,
  isDesktopPointer,
} from '../shared/createRendererRuntime';
import { readScrollProgress } from '../shared/scrollProgress';
import styles from './ChamberVoid.module.css';

const SHARD_COUNT = 28;

const GLASS_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vWorld;
varying vec4 vClip;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - world.xyz;
  vClip = projectionMatrix * viewMatrix * world;
  gl_Position = vClip;
}
`;

const GLASS_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uIor;
uniform float uThick;
uniform float uChroma;
uniform float uTime;
uniform vec3 uLight;
varying vec3 vN;
varying vec3 vV;
varying vec3 vWorld;
varying vec4 vClip;

void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float ndv = clamp(abs(dot(n, v)), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 2.4);

  vec2 uv = vClip.xy / max(vClip.w, 0.0001);
  uv = uv * 0.5 + 0.5;
  vec3 rf = refract(-v, n, 1.0 / uIor);
  if (rf.x == 0.0 && rf.y == 0.0 && rf.z == 0.0) {
    rf = reflect(-v, n) * 0.25;
  }
  float mass = uThick * mix(0.35, 1.15, ndv);
  vec2 offset = rf.xy * mass * 0.16;
  offset += n.xy * 0.028 * (1.0 - ndv);

  vec2 base = clamp(uv, 0.0, 1.0);
  vec2 uvR = clamp(uv + offset * (1.0 + uChroma), 0.0, 1.0);
  vec2 uvG = clamp(uv + offset, 0.0, 1.0);
  vec2 uvB = clamp(uv + offset * (1.0 - uChroma), 0.0, 1.0);
  vec3 behind = texture2D(tScene, base).rgb;
  vec3 refracted = vec3(
    texture2D(tScene, uvR).r,
    texture2D(tScene, uvG).g,
    texture2D(tScene, uvB).b
  );
  refracted = mix(behind, refracted, 0.82);

  float glow = max(refracted.r, max(refracted.g, refracted.b));
  refracted += refracted * glow * 0.34;
  refracted *= vec3(0.97, 0.99, 1.03);

  vec3 rd = reflect(-v, n);
  float slitA = smoothstep(0.16, 0.0, abs(rd.x - 0.12)) * smoothstep(-0.2, 0.85, rd.y);
  float slitB = smoothstep(0.1, 0.0, abs(rd.x + 0.38)) * 0.7;
  float disc = pow(max(rd.y, 0.0), 8.0) * 0.55;
  vec3 env = vec3(0.03, 0.032, 0.038) + vec3(1.0, 0.96, 0.88) * (slitA * 0.8 + slitB * 0.45 + disc);

  vec3 h = normalize(normalize(uLight) + v);
  float spec = pow(max(dot(n, h), 0.0), 88.0);
  float specWide = pow(max(dot(n, normalize(uLight)), 0.0), 24.0);
  float inner = pow(ndv, 1.45) * 0.16;

  vec3 glass = mix(refracted, env, fresnel * 0.42);
  glass += spec * vec3(1.0, 0.97, 0.9) * 1.2;
  glass += specWide * vec3(0.86, 0.84, 0.78) * 0.14;
  glass += fresnel * vec3(0.98, 0.94, 0.86) * 0.38;
  glass += vec3(0.1, 0.09, 0.07) * inner;
  glass += vec3(0.03, 0.035, 0.045) * (0.16 + 0.08 * sin(uTime * 0.7 + vWorld.y * 4.0));

  gl_FragColor = vec4(glass, 1.0);
}
`;

const FRESNEL_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRESNEL_FRAG = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(vV);
  float fresnel = pow(1.0 - abs(dot(n, v)), 2.05);
  vec3 light = normalize(vec3(-0.28, 0.82, 0.48));
  float spec = pow(max(dot(n, light), 0.0), 90.0);
  vec3 edge = vec3(0.99, 0.96, 0.88);
  vec3 color = edge * (fresnel * 1.12 + spec * 1.4);
  float alpha = clamp(0.05 + fresnel * 0.92 + spec * 0.7, 0.0, 1.0);
  gl_FragColor = vec4(color, alpha);
}
`;

function makeWordmarkTexture(text: string): Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e7e2d6';
  ctx.font = '400 320px "Instrument Serif", "Times New Roman", serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, 48, 320);
  const map = new Texture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.needsUpdate = true;
  return map;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

const PATH_POS = new Vector3();
const PATH_TARGET = new Vector3();
const INTRO_POS = new Vector3();
const INTRO_TARGET = new Vector3();
const PREV_QUAT = new Quaternion();
const LOOK_OFFSET = new Vector3();
const DRAW = new Vector2();

function pathAt(scroll: number, position: Vector3, target: Vector3): void {
  const t = smooth(Math.min(1, Math.max(0, scroll)));
  if (t < 0.5) {
    const u = t / 0.5;
    position.set(lerp(0.08, 1.48, u), lerp(0.48, -0.08, u), lerp(5.35, 2.92, u));
    target.set(lerp(0, 0.06, u), lerp(-1.02, -1.14, u), lerp(0.05, -0.1, u));
    return;
  }
  const u = (t - 0.5) / 0.5;
  position.set(lerp(1.48, -0.52, u), lerp(-0.08, -0.58, u), lerp(2.92, 2.12, u));
  target.set(lerp(0.06, 0.18, u), lerp(-1.14, -0.76, u), lerp(-0.1, -0.42, u));
}

function makeContactTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const map = new Texture(canvas);
  if (!ctx) return map;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  gradient.addColorStop(0.32, 'rgba(0, 0, 0, 0.34)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  map.needsUpdate = true;
  return map;
}

function startWorld(
  node: HTMLDivElement,
  logoUrl: string | null,
  brandName: string,
  mediaUrl: string | null,
  mediaKind: 'image' | 'video' | null,
  compact: boolean,
): (() => void) | undefined {
  const mobile = window.matchMedia('(max-width: 720px)').matches;
  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: true,
    alpha: false,
    desktopDpr: compact ? 1.25 : 1.6,
    mobileDpr: compact ? 1 : 1.2,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  const scene = new Scene();
  scene.background = new Color(0x050506);
  scene.fog = compact ? null : new Fog(0x050506, 11, 28);

  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(compact ? 36 : 34, 1, 0.1, 80);
  camera.setFocalLength(compact ? 48 : 55);
  camera.position.set(0, compact ? 0.1 : 3.6, compact ? 3.42 : 8.4);
  const look = new Vector3(compact ? 0.02 : 0, compact ? -1.14 : -1.05, 0.04);
  camera.lookAt(look);
  const desiredQuat = new Quaternion().copy(camera.quaternion);

  const wallMat = new MeshStandardMaterial({
    color: compact ? 0x16161c : 0x121216,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.4,
  });
  const floorMat = new MeshPhysicalMaterial({
    color: 0x070709,
    roughness: 0.04,
    metalness: 0.92,
    envMapIntensity: 1.8,
  });

  const wallGeo = new PlaneGeometry(11, 7);
  const floorGeo = new PlaneGeometry(14, 14);
  const back = new Mesh(wallGeo, wallMat);
  back.position.z = -3.4;
  const left = new Mesh(wallGeo, wallMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-5.35, 1.45, 1.05);
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.05;
  scene.add(back, left, floor);

  const windowMat = new MeshBasicMaterial({
    color: 0xfff4e2,
    toneMapped: false,
  });
  const coolMat = new MeshBasicMaterial({
    color: 0xd8e6f4,
    toneMapped: false,
  });
  const windowGeo = new PlaneGeometry(compact ? 1.42 : 0.92, compact ? 3.45 : 3.2);
  const windowLite = new Mesh(windowGeo, windowMat);
  windowLite.position.set(0.04, -0.62, -3.33);
  const slitGeo = new PlaneGeometry(0.14, 2.9);
  const slitLite = new Mesh(slitGeo, coolMat);
  slitLite.position.set(-0.72, -0.48, -3.33);
  const slitGeoB = new PlaneGeometry(0.09, 2.05);
  const slitLiteB = new Mesh(slitGeoB, windowMat);
  slitLiteB.position.set(0.7, -0.22, -3.33);
  scene.add(windowLite, slitLite, slitLiteB);

  const ambient = new AmbientLight(0xe7e2d6, 0.04);
  const hemi = new HemisphereLight(0xf7f2e8, 0x08080a, 0.3);
  const key = new DirectionalLight(0xfff8ee, 1.48);
  key.position.set(-2.6, 5.2, 3.2);
  const fill = new DirectionalLight(0x8a9aaa, 0.16);
  fill.position.set(3.8, 0.4, 2.6);
  const rim = new PointLight(0xf8f1e4, 1.12, 8.2, 1.7);
  rim.position.set(1.35, -0.05, -1.15);
  const edge = new PointLight(0xfff6ea, 0.7, 5.5, 2);
  edge.position.set(-0.85, -0.4, 1.35);
  const windowKey = new PointLight(0xfff1d4, compact ? 4.2 : 5.4, 8.5, 1.2);
  windowKey.position.set(0.12, -0.5, -2.42);
  const burst = new PointLight(0xfff1d6, compact ? 0.1 : 0, 8, 1.6);
  burst.position.set(0, -0.85, 0.2);
  scene.add(ambient, hemi, key, fill, rim, edge, windowKey, burst);

  const contactMap = makeContactTexture();
  const contactGeo = new CircleGeometry(1.7, 48);
  const contactMat = new MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const contact = new Mesh(contactGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -2.035, 0.08);
  scene.add(contact);

  const causticMap = makeContactTexture();
  const causticMat = new MeshBasicMaterial({
    map: causticMap,
    color: 0xf0e2c6,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const caustic = new Mesh(contactGeo, causticMat);
  caustic.rotation.x = -Math.PI / 2;
  caustic.position.set(0.18, -2.032, 0.22);
  caustic.scale.set(0.55, 0.55, 0.72);
  scene.add(caustic);

  const architecture = new Group();
  const pillarGeo = new BoxGeometry(0.14, 3.6, 0.14);
  const pillarMat = new MeshStandardMaterial({
    color: 0x1c1c20,
    roughness: 0.8,
    metalness: 0.18,
    envMapIntensity: 0.4,
  });
  for (const x of [-2.7, 2.7]) {
    const pillar = new Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, -0.28, -2.5);
    architecture.add(pillar);
  }
  const lintelGeo = new BoxGeometry(5.7, 0.12, 0.12);
  const lintel = new Mesh(lintelGeo, pillarMat);
  lintel.position.set(0, 1.48, -2.5);
  architecture.add(lintel);
  scene.add(architecture);

  const sceneRT = new WebGLRenderTarget(8, 8, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });
  sceneRT.texture.generateMipmaps = false;
  const glassUniforms = {
    tScene: { value: sceneRT.texture },
    uResolution: { value: new Vector2(8, 8) },
    uIor: { value: 1.52 },
    uThick: { value: compact || mobile ? 1.55 : 1.85 },
    uChroma: { value: compact || mobile ? 0.016 : 0.022 },
    uTime: { value: 0 },
    uLight: { value: new Vector3(-0.32, 0.86, 0.42) },
  };
  const crystalMat = new ShaderMaterial({
    uniforms: glassUniforms,
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    toneMapped: false,
  });
  const crystalGeo = new IcosahedronGeometry(0.76, 1);
  const crystal = new Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, -1.18, 0.08);
  const rimMat = new ShaderMaterial({
    vertexShader: FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const rimShell = new Mesh(crystalGeo, rimMat);
  rimShell.position.copy(crystal.position);
  rimShell.scale.setScalar(1.02);
  scene.add(crystal, rimShell);

  const shardMat = new MeshPhysicalMaterial({
    color: 0xeadcc4,
    roughness: 0.18,
    metalness: 0.28,
    envMapIntensity: 1.15,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
    transmission: 0.35,
    thickness: 0.4,
    ior: 1.45,
  });
  const shardGeo = new TetrahedronGeometry(0.16, 0);
  const shards = new InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const dummy = new Object3D();
  const rand = mulberry32(0xc4a4be4);
  const origins: Vector3[] = [];
  const velocities: Vector3[] = [];
  const spins: Vector3[] = [];
  const rest: Array<{ x: number; y: number; z: number; rx: number; ry: number; s: number }> = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const ring = i < 16 ? 0 : 1;
    const localT = ring === 0 ? i / 15 : (i - 16) / 11;
    const angle = ring === 0 ? -1.05 + localT * 2.1 : -0.72 + localT * 1.44;
    const radius = (ring === 0 ? 0.92 : 1.28) + (i % 3) * 0.12;
    rest.push({
      x: Math.sin(angle) * radius * 1.16,
      y: -1.96,
      z: 0.52 + Math.cos(angle) * radius * 0.34,
      rx: 0.28 * (i % 5) + (rand() - 0.5) * 0.1,
      ry: angle + (i % 4) * 0.08,
      s: (ring === 0 ? 0.36 : 0.26) + (i % 5) * 0.04,
    });
    origins.push(new Vector3(0, -1.18, 0.08));
    velocities.push(
      new Vector3(
        Math.sin(angle) * (1.85 + ring * 0.35),
        0.72 + (i % 7) * 0.09,
        0.62 + Math.cos(angle) * 0.4,
      ),
    );
    spins.push(new Vector3((i % 3) - 1, (i % 5) - 2, ((i % 4) - 1.5) * 0.9));
  }
  scene.add(shards);

  const frameGeo = new PlaneGeometry(3.2, 4.1);
  const frameMat = new MeshStandardMaterial({
    color: 0x0c0c0e,
    roughness: 0.55,
    metalness: 0.12,
    envMapIntensity: 0.3,
  });
  const mediaMat = new MeshBasicMaterial({
    color: 0x111113,
    transparent: true,
    opacity: 0,
  });
  const pictureFrame = new Mesh(frameGeo, frameMat);
  pictureFrame.position.set(-2.05, 0.15, -3.32);
  const mediaGeo = new PlaneGeometry(2.86, 3.72);
  const mediaMesh = new Mesh(mediaGeo, mediaMat);
  mediaMesh.position.set(-2.05, 0.15, -3.28);
  pictureFrame.visible = Boolean(mediaUrl) && !compact;
  mediaMesh.visible = Boolean(mediaUrl) && !compact;
  scene.add(pictureFrame, mediaMesh);

  let brandTexture: Texture | null = null;
  let mediaTexture: Texture | null = null;
  let videoEl: HTMLVideoElement | null = null;
  const brandGeo = new PlaneGeometry(compact ? 3.6 : 5.4, compact ? 1.35 : 2);
  const brandMat = new MeshBasicMaterial({
    transparent: true,
    opacity: compact ? 0.9 : 0,
    depthWrite: false,
  });
  const brandMesh = new Mesh(brandGeo, brandMat);
  brandMesh.position.set(1.22, 0.42, -3.3);
  brandMesh.visible = !compact;
  scene.add(brandMesh);

  if (logoUrl) {
    const loader = new TextureLoader();
    loader.load(logoUrl, (map) => {
      brandTexture = map;
      map.colorSpace = SRGBColorSpace;
      brandMat.map = map;
      brandMat.needsUpdate = true;
      brandMat.opacity = 0.94;
    });
  } else if (brandName) {
    const map = makeWordmarkTexture(brandName);
    if (map) {
      brandTexture = map;
      brandMat.map = map;
      brandMat.needsUpdate = true;
      brandMat.opacity = 0.9;
    }
  }

  if (mediaUrl && mediaKind === 'image') {
    const loader = new TextureLoader();
    loader.load(mediaUrl, (map) => {
      mediaTexture = map;
      map.colorSpace = SRGBColorSpace;
      mediaMat.map = map;
      mediaMat.color.set(0xffffff);
      mediaMat.opacity = 1;
      mediaMat.needsUpdate = true;
    });
  } else if (mediaUrl && mediaKind === 'video' && !compact) {
    videoEl = document.createElement('video');
    videoEl.src = mediaUrl;
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.playsInline = true;
    videoEl.setAttribute('playsinline', '');
    void videoEl.play().catch(() => undefined);
    const map = new VideoTexture(videoEl);
    map.colorSpace = SRGBColorSpace;
    mediaTexture = map;
    mediaMat.map = map;
    mediaMat.color.set(0xffffff);
    mediaMat.opacity = 1;
    mediaMat.needsUpdate = true;
  }

  let raf = 0;
  let elapsed = compact ? 1.65 : 0;
  let last = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let dampX = 0;
  let dampY = 0;
  let scroll = 0;
  let scrollPrev = 0;
  let scrollVel = 0;
  let camMom = 0;
  let lastAspect = 0;
  let lastBufW = 0;
  let lastBufH = 0;
  const allowPointer = isDesktopPointer();
  const mappedTone = renderer.toneMapping;

  function onPointer(event: PointerEvent): void {
    if (!allowPointer) return;
    const rect = node.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  }

  function onScroll(): void {
    if (compact) return;
    scroll = readScrollProgress(node);
  }

  node.addEventListener('pointermove', onPointer, { passive: true });
  if (!compact) {
    window.addEventListener('scroll', onScroll, { passive: true });
    const scroller = node.closest('[data-preview-scroller]');
    if (scroller instanceof HTMLElement) {
      scroller.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function tick(now: number): void {
    raf = window.requestAnimationFrame(tick);
    if (!gl.isRunning()) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += delta;
    const width = node.clientWidth || 1;
    const height = node.clientHeight || 1;
    const aspect = width / height;
    if (aspect !== lastAspect) {
      lastAspect = aspect;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      camera.setFocalLength(compact ? 48 : 55);
    }
    renderer.getDrawingBufferSize(DRAW);
    const bufW = Math.max(1, Math.floor(DRAW.x));
    const bufH = Math.max(1, Math.floor(DRAW.y));
    if (bufW !== lastBufW || bufH !== lastBufH) {
      lastBufW = bufW;
      lastBufH = bufH;
      sceneRT.setSize(bufW, bufH);
      glassUniforms.uResolution.value.set(bufW, bufH);
    }

    dampX += (pointerX - dampX) * 0.055;
    dampY += (pointerY - dampY) * 0.055;
    const rawScroll = compact ? 0 : readScrollProgress(node);
    const instVel = (rawScroll - scrollPrev) / Math.max(delta, 0.001);
    scrollPrev = rawScroll;
    scrollVel += (instVel - scrollVel) * 0.18;
    scrollVel *= Math.exp(-3.6 * delta);
    camMom += scrollVel * 0.22;
    camMom *= Math.exp(-2.8 * delta);
    if (!compact) scroll += (rawScroll - scroll) * 0.075;

    if (compact) {
      camera.position.set(0.52 + dampX * 0.1, 0.1 + dampY * 0.04, 3.42);
      LOOK_OFFSET.set(0.02 + dampX * 0.04, -1.14, 0.04);
      camera.lookAt(LOOK_OFFSET);
    } else {
      const intro = 1 - Math.exp(-elapsed * 0.86);
      const kick = Math.max(0, 1 - elapsed / 0.62);
      pathAt(scroll, PATH_POS, PATH_TARGET);
      INTRO_POS.set(0, 3.6, 8.4).lerp(PATH_POS, intro);
      INTRO_TARGET.set(0, -1.2, -0.2).lerp(PATH_TARGET, intro);
      INTRO_POS.x += dampX * 0.34 + camMom * 0.55;
      INTRO_POS.y += Math.sin(elapsed * 0.11) * 0.03 + Math.cos(elapsed * 38) * kick * 0.028 + camMom * 0.12;
      INTRO_POS.z += Math.sin(elapsed * 46) * kick * 0.04 - Math.abs(camMom) * 0.18;
      camera.position.copy(INTRO_POS);
      look.lerp(INTRO_TARGET, 0.08);
      LOOK_OFFSET.set(look.x + dampX * 0.1, look.y - dampY * 0.08, look.z);
      PREV_QUAT.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK_OFFSET);
      desiredQuat.copy(camera.quaternion);
      camera.quaternion.copy(PREV_QUAT).slerp(desiredQuat, 0.12);
      brandMat.opacity = Math.min(0.88, intro * 1.1);
    }

    const shatterT = compact ? 1 : Math.min(elapsed / 1.55, 1);
    const settle = shatterT * shatterT * (3 - 2 * shatterT);
    const kick = compact ? 0 : Math.max(0, 1 - elapsed / 0.62);
    burst.intensity = compact ? 0.1 : 2.8 * Math.exp(-elapsed * 2.1) + 0.08;
    key.intensity = 1.48 + kick * 0.55 + Math.abs(camMom) * 0.35;
    windowKey.intensity = (compact ? 4.2 : 5.4) + kick * 1.1;
    crystal.rotation.y = elapsed * 0.09 + camMom * 0.85 + dampX * 0.12;
    crystal.rotation.x = Math.sin(elapsed * 0.16) * 0.055 + camMom * 0.18;
    crystal.rotation.z = dampY * 0.04;
    const liveScale = compact ? 0.84 : 0.48 + settle * 0.52;
    crystal.scale.setScalar(liveScale);
    rimShell.rotation.copy(crystal.rotation);
    rimShell.scale.setScalar(liveScale * 1.02);
    glassUniforms.uTime.value = elapsed;
    glassUniforms.uThick.value = (compact || mobile ? 1.55 : 1.85) + Math.abs(camMom) * 0.35;
    caustic.rotation.z = elapsed * 0.04;
    causticMat.opacity = 0.28 + Math.abs(camMom) * 0.2 + (1 - settle) * 0.18;

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const origin = origins[i];
      const vel = velocities[i];
      const spin = spins[i];
      const home = rest[i];
      const delay = (i / SHARD_COUNT) * 0.28;
      const local = smooth(Math.min(1, Math.max(0, (shatterT - delay) / 0.72)));
      const stretch = 1 - local;
      const lift = Math.sin(local * Math.PI) * (0.55 + (i % 4) * 0.08);
      const burstX = origin.x + vel.x * local * (0.7 + stretch);
      const burstY = origin.y + vel.y * local + lift - 2.05 * local * local;
      const burstZ = origin.z + vel.z * local;
      dummy.position.set(
        burstX + (home.x - burstX) * local + camMom * 0.08 * stretch,
        burstY + (home.y - burstY) * local,
        burstZ + (home.z - burstZ) * local,
      );
      dummy.rotation.set(
        spin.x * stretch * 0.85 + home.rx,
        spin.y * stretch * 0.55 + home.ry + elapsed * 0.035,
        spin.z * stretch * 0.4,
      );
      dummy.scale.setScalar(home.s * (0.55 + stretch * 0.85 + (1 - local) * 0.2));
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;

    crystal.visible = false;
    rimShell.visible = false;
    renderer.toneMapping = NoToneMapping;
    renderer.setRenderTarget(sceneRT);
    renderer.render(scene, camera);

    crystal.visible = true;
    rimShell.visible = true;
    renderer.setRenderTarget(null);
    renderer.toneMapping = mappedTone;
    renderer.render(scene, camera);
  }

  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    node.removeEventListener('pointermove', onPointer);
    if (!compact) {
      window.removeEventListener('scroll', onScroll);
      const scroller = node.closest('[data-preview-scroller]');
      if (scroller instanceof HTMLElement) {
        scroller.removeEventListener('scroll', onScroll);
      }
    }
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
    }
    wallGeo.dispose();
    floorGeo.dispose();
    windowGeo.dispose();
    slitGeo.dispose();
    slitGeoB.dispose();
    shardGeo.dispose();
    pillarGeo.dispose();
    lintelGeo.dispose();
    crystalGeo.dispose();
    frameGeo.dispose();
    mediaGeo.dispose();
    brandGeo.dispose();
    contactGeo.dispose();
    wallMat.dispose();
    floorMat.dispose();
    crystalMat.dispose();
    rimMat.dispose();
    shardMat.dispose();
    pillarMat.dispose();
    frameMat.dispose();
    mediaMat.dispose();
    brandMat.dispose();
    contactMat.dispose();
    causticMat.dispose();
    windowMat.dispose();
    coolMat.dispose();
    contactMap.dispose();
    causticMap.dispose();
    brandTexture?.dispose();
    mediaTexture?.dispose();
    sceneRT.dispose();
    gl.dispose();
  };
}

interface ChamberVoidProps {
  logoUrl: string | null;
  brandName: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
  compact?: boolean;
}

export default function ChamberVoid({
  logoUrl,
  brandName,
  mediaUrl = null,
  mediaKind = null,
  compact = false,
}: ChamberVoidProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startWorld(node, logoUrl, brandName, mediaUrl, mediaKind, compact);
  }, [logoUrl, brandName, mediaUrl, mediaKind, compact]);

  return (
    <div
      ref={hostRef}
      className={`${styles.void} ${compact ? styles.compact : ''}`}
      aria-hidden="true"
    />
  );
}
