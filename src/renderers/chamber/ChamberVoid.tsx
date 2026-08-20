import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  SRGBColorSpace,
  TetrahedronGeometry,
  Texture,
  TextureLoader,
  Vector3,
  VideoTexture,
} from 'three';
import { mulberry32 } from '../../generator/mapping/assetHelpers';
import {
  createRendererRuntime,
  createStudioEnvironment,
  isDesktopPointer,
} from '../shared/createRendererRuntime';
import { readScrollProgress } from '../shared/scrollProgress';
import styles from './ChamberVoid.module.css';

const SHARD_COUNT = 9;

function makeWordmarkTexture(text: string): Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#c4b19a';
  ctx.font = '400 220px "IBM Plex Mono", "SFMono-Regular", monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text.toUpperCase(), 48, 320);
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

type CameraKey = { t: number; px: number; py: number; pz: number; tx: number; ty: number; tz: number };

const PATH: CameraKey[] = [
  { t: 0, px: 0.18, py: 2.62, pz: 10.4, tx: 0.02, ty: -0.18, tz: -1.6 },
  { t: 0.22, px: 0.62, py: 1.12, pz: 6.35, tx: 0.04, ty: -0.42, tz: -0.45 },
  { t: 0.48, px: 2.48, py: 0.48, pz: 4.72, tx: -0.12, ty: -0.5, tz: 0.08 },
  { t: 0.74, px: 0.88, py: 0.06, pz: 2.85, tx: 0.04, ty: -0.56, tz: 0.1 },
  { t: 1, px: -0.38, py: 0.32, pz: 2.58, tx: 0.12, ty: -0.38, tz: -0.08 },
];

function pathAt(scroll: number, position: Vector3, target: Vector3, immersive: boolean): void {
  const t = smooth(Math.min(1, Math.max(0, scroll)));
  let from = PATH[0];
  let to = PATH[1];
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const a = PATH[i];
    const b = PATH[i + 1];
    if (!a || !b) continue;
    if (t >= a.t && t <= b.t) {
      from = a;
      to = b;
      break;
    }
    from = a;
    to = b;
  }
  if (!from || !to) return;
  const span = Math.max(to.t - from.t, 0.0001);
  const u = smooth((t - from.t) / span);
  const pull = immersive ? 1.18 : 1;
  position.set(
    lerp(from.px, to.px, u) * pull,
    lerp(from.py, to.py, u) + (immersive ? 0.18 : 0),
    lerp(from.pz, to.pz, u) * (immersive ? 1.22 : 1),
  );
  target.set(lerp(from.tx, to.tx, u), lerp(from.ty, to.ty, u), lerp(from.tz, to.tz, u));
}

function makeContactTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const map = new Texture(canvas);
  if (!ctx) return map;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(18, 14, 10, 0.82)');
  gradient.addColorStop(0.34, 'rgba(28, 22, 16, 0.28)');
  gradient.addColorStop(1, 'rgba(26, 22, 18, 0)');
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
  immersive: boolean,
  environmentUrl: string | null,
): (() => void) | undefined {
  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: true,
    alpha: false,
    desktopDpr: compact ? 1.25 : immersive ? 1.55 : 1.45,
    mobileDpr: compact ? 1 : 1.2,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  const scene = new Scene();
  scene.background = new Color(0x1a1612);
  scene.fog = compact ? new Fog(0x1a1612, 8, 18) : new Fog(0x1a1612, 10, 24);

  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const fov = compact ? 34 : immersive ? 38 : 30;
  const camera = new PerspectiveCamera(fov, 1, 0.1, 80);
  camera.setFocalLength(compact ? 42 : immersive ? 40 : 58);
  if (compact) {
    camera.position.set(1.62, 0.78, 5.85);
  } else if (immersive) {
    camera.position.set(0.2, 3.9, 12.6);
  } else {
    camera.position.set(0.12, 3.2, 9.4);
  }
  const look = new Vector3(compact ? 0.04 : 0, compact ? -0.48 : -0.2, compact ? -0.18 : -1.4);
  camera.lookAt(look);
  const desiredQuat = new Quaternion().copy(camera.quaternion);

  const wallMat = new MeshStandardMaterial({
    color: 0x241e18,
    roughness: 0.92,
    metalness: 0.04,
    envMapIntensity: 0.28,
  });
  const sideMat = new MeshStandardMaterial({
    color: 0x1f1a16,
    roughness: 0.9,
    metalness: 0.05,
    envMapIntensity: 0.22,
  });
  const floorMat = new MeshStandardMaterial({
    color: 0x3a3228,
    roughness: 0.78,
    metalness: 0.08,
    envMapIntensity: 0.35,
  });
  const ceilingMat = new MeshStandardMaterial({
    color: 0x181410,
    roughness: 0.94,
    metalness: 0.02,
    envMapIntensity: 0.18,
  });
  const stoneMat = new MeshStandardMaterial({
    color: 0x4a3c30,
    roughness: 0.7,
    metalness: 0.12,
    envMapIntensity: 0.4,
  });
  const copperMat = new MeshStandardMaterial({
    color: 0x8a6a4a,
    roughness: 0.42,
    metalness: 0.55,
    envMapIntensity: 0.7,
  });

  const wallGeo = new PlaneGeometry(16, 8.4);
  const floorGeo = new PlaneGeometry(18, 18);
  const back = new Mesh(wallGeo, wallMat);
  back.position.set(0, 0.55, -4.15);
  const left = new Mesh(wallGeo, sideMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-6.4, 0.55, 1.2);
  const right = new Mesh(wallGeo, sideMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(6.6, 0.55, 0.4);
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.72;
  const ceiling = new Mesh(floorGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 3.35;
  scene.add(back, left, right, floor, ceiling);

  const viewGeo = new PlaneGeometry(2.55, 3.85);
  const viewMat = new MeshBasicMaterial({
    color: 0xc4893c,
    toneMapped: false,
  });
  const view = new Mesh(viewGeo, viewMat);
  view.position.set(0.18, 0.22, -4.05);
  const paneGeo = new PlaneGeometry(2.35, 3.6);
  const paneMat = new MeshBasicMaterial({
    color: 0xffd9a0,
    transparent: true,
    opacity: 0.22,
    toneMapped: false,
    depthWrite: false,
  });
  const pane = new Mesh(paneGeo, paneMat);
  pane.position.set(0.18, 0.22, -3.92);
  const slitGeo = new PlaneGeometry(0.18, 4.15);
  const slitMat = new MeshBasicMaterial({
    color: 0xffc878,
    toneMapped: false,
  });
  const slitLite = new Mesh(slitGeo, slitMat);
  slitLite.position.set(-1.42, 0.18, -4.02);
  const coolGeo = new PlaneGeometry(0.1, 2.4);
  const coolMat = new MeshBasicMaterial({
    color: 0x7a8a92,
    toneMapped: false,
  });
  const coolSlit = new Mesh(coolGeo, coolMat);
  coolSlit.position.set(1.62, 0.55, -4.02);
  scene.add(view, pane, slitLite, coolSlit);

  const frameGroup = new Group();
  const frameV = new BoxGeometry(0.08, 4.05, 0.12);
  const frameH = new BoxGeometry(2.72, 0.08, 0.12);
  const leftFrame = new Mesh(frameV, copperMat);
  leftFrame.position.set(-1.12, 0.22, -3.98);
  const rightFrame = new Mesh(frameV, copperMat);
  rightFrame.position.set(1.48, 0.22, -3.98);
  const topFrame = new Mesh(frameH, copperMat);
  topFrame.position.set(0.18, 2.22, -3.98);
  const bottomFrame = new Mesh(frameH, copperMat);
  bottomFrame.position.set(0.18, -1.72, -3.98);
  frameGroup.add(leftFrame, rightFrame, topFrame, bottomFrame);
  scene.add(frameGroup);

  const plinthBaseGeo = new BoxGeometry(1.14, 0.14, 1.14);
  const plinthBase = new Mesh(plinthBaseGeo, stoneMat);
  plinthBase.position.set(0, -1.65, 0.28);
  const plinthBodyGeo = new BoxGeometry(0.82, 0.44, 0.82);
  const plinthBody = new Mesh(plinthBodyGeo, stoneMat);
  plinthBody.position.set(0, -1.36, 0.28);
  const plinthCapGeo = new BoxGeometry(0.9, 0.03, 0.9);
  const plinthCap = new Mesh(plinthCapGeo, copperMat);
  plinthCap.position.set(0, -1.125, 0.28);
  scene.add(plinthBase, plinthBody, plinthCap);

  const ambient = new AmbientLight(0x8a6a4a, 0.16);
  const hemi = new HemisphereLight(0xc4893c, 0x1a1612, 0.26);
  const key = new DirectionalLight(0xffe8c8, 0.92);
  key.position.set(-2.6, 5.2, 3.8);
  const fill = new DirectionalLight(0x8a9aa4, 0.42);
  fill.position.set(3.8, 1.4, 3.2);
  const rim = new PointLight(0xa8b4bc, 0.55, 8.4, 1.8);
  rim.position.set(0.55, 0.85, 1.15);
  const edge = new PointLight(0x8a6a4a, 0.32, 6.2, 2);
  edge.position.set(-1.1, -0.2, 1.4);
  const windowKey = new PointLight(0xffc878, compact ? 1.35 : immersive ? 1.85 : 1.6, 9.5, 1.35);
  windowKey.position.set(0.18, 0.3, -3.2);
  scene.add(ambient, hemi, key, fill, rim, edge, windowKey);

  const contactMap = makeContactTexture();
  const contactGeo = new CircleGeometry(1.35, 48);
  const contactMat = new MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const contact = new Mesh(contactGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -1.705, 0.28);
  scene.add(contact);

  const architecture = new Group();
  const pillarGeo = new BoxGeometry(0.22, 4.4, 0.22);
  const pillarMat = new MeshStandardMaterial({
    color: 0x2c261f,
    roughness: 0.82,
    metalness: 0.16,
    envMapIntensity: 0.32,
  });
  for (const x of [-3.15, 3.25]) {
    const pillar = new Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, 0.45, -3.55);
    architecture.add(pillar);
  }
  const lintelGeo = new BoxGeometry(6.7, 0.18, 0.22);
  const lintel = new Mesh(lintelGeo, pillarMat);
  lintel.position.set(0.05, 2.55, -3.55);
  architecture.add(lintel);
  const benchGeo = new BoxGeometry(1.8, 0.12, 0.42);
  const bench = new Mesh(benchGeo, stoneMat);
  bench.position.set(-3.4, -1.42, 0.85);
  architecture.add(bench);
  scene.add(architecture);

  const glassMat = new MeshPhysicalMaterial({
    color: 0xe6eef2,
    roughness: 0.06,
    metalness: 0.0,
    transmission: 0.94,
    thickness: 0.85,
    ior: 1.5,
    envMapIntensity: 1.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    specularIntensity: 1,
    transparent: true,
    opacity: 1,
    attenuationColor: new Color(0xb7c4cc),
    attenuationDistance: 1.25,
  });
  const glassGeo = new BoxGeometry(0.48, 0.92, 0.3);
  const glass = new Mesh(glassGeo, glassMat);
  glass.position.set(0, -0.65, 0.28);
  const edgeGeo = new EdgesGeometry(glassGeo);
  const edgeMat = new LineBasicMaterial({
    color: 0xf7fafb,
    transparent: true,
    opacity: 0.55,
  });
  const glassEdges = new LineSegments(edgeGeo, edgeMat);
  glass.add(glassEdges);
  const railGeo = new BoxGeometry(0.018, 0.96, 0.018);
  const railOffsets: Array<[number, number]> = [
    [-0.24, -0.15],
    [0.24, -0.15],
    [-0.24, 0.15],
    [0.24, 0.15],
  ];
  for (const [x, z] of railOffsets) {
    const rail = new Mesh(railGeo, copperMat);
    rail.position.set(x, 0, z);
    glass.add(rail);
  }
  scene.add(glass);

  const shardMat = new MeshPhysicalMaterial({
    color: 0xc4a882,
    roughness: 0.22,
    metalness: 0.22,
    envMapIntensity: 0.9,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    transmission: 0.28,
    thickness: 0.28,
    ior: 1.45,
  });
  const shardGeo = new TetrahedronGeometry(0.12, 0);
  const shards = new InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const dummy = new Object3D();
  const rand = mulberry32(0xc4a4be4);
  const origins: Vector3[] = [];
  const velocities: Vector3[] = [];
  const spins: Vector3[] = [];
  const rest: Array<{ x: number; y: number; z: number; rx: number; ry: number; s: number }> = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const along = (i / (SHARD_COUNT - 1)) * 2 - 1;
    rest.push({
      x: along * 1.55 + (rand() - 0.5) * 0.12,
      y: 1.35 + (i % 3) * 0.18,
      z: -3.55 + Math.abs(along) * 0.08,
      rx: 0.18 * (i % 4),
      ry: along * 0.4,
      s: 0.42 + (i % 3) * 0.08,
    });
    origins.push(new Vector3(0, -0.65, 0.28));
    velocities.push(
      new Vector3(along * 1.15, 1.05 + (i % 3) * 0.12, -0.85 - Math.abs(along) * 0.2),
    );
    spins.push(new Vector3((i % 3) - 1, (i % 5) - 2, ((i % 4) - 1.5) * 0.4));
  }
  scene.add(shards);

  const frameGeo = new PlaneGeometry(1.65, 2.15);
  const frameMat = new MeshStandardMaterial({
    color: 0x1c1814,
    roughness: 0.62,
    metalness: 0.1,
    envMapIntensity: 0.25,
  });
  const mediaMat = new MeshBasicMaterial({
    color: 0x111113,
    transparent: true,
    opacity: 0,
  });
  const pictureFrame = new Mesh(frameGeo, frameMat);
  pictureFrame.position.set(-3.55, 0.35, -3.95);
  const mediaGeo = new PlaneGeometry(1.48, 1.95);
  const mediaMesh = new Mesh(mediaGeo, mediaMat);
  mediaMesh.position.set(-3.55, 0.35, -3.9);
  pictureFrame.visible = Boolean(mediaUrl) && !compact;
  mediaMesh.visible = Boolean(mediaUrl) && !compact;
  scene.add(pictureFrame, mediaMesh);

  let brandTexture: Texture | null = null;
  let mediaTexture: Texture | null = null;
  let viewTexture: Texture | null = null;
  let videoEl: HTMLVideoElement | null = null;
  const brandGeo = new PlaneGeometry(compact ? 2.2 : 3.4, compact ? 0.55 : 0.72);
  const brandMat = new MeshBasicMaterial({
    transparent: true,
    opacity: compact ? 0.72 : 0,
    depthWrite: false,
  });
  const brandMesh = new Mesh(brandGeo, brandMat);
  brandMesh.position.set(-4.85, 1.55, -3.95);
  brandMesh.rotation.y = Math.PI / 2;
  brandMesh.visible = !compact;
  scene.add(brandMesh);

  if (environmentUrl) {
    const loader = new TextureLoader();
    loader.load(environmentUrl, (map) => {
      viewTexture = map;
      map.colorSpace = SRGBColorSpace;
      viewMat.map = map;
      viewMat.color.set(0xe8c090);
      viewMat.needsUpdate = true;
    });
  }

  if (logoUrl) {
    const loader = new TextureLoader();
    loader.load(logoUrl, (map) => {
      brandTexture = map;
      map.colorSpace = SRGBColorSpace;
      brandMat.map = map;
      brandMat.needsUpdate = true;
      brandMat.opacity = 0.82;
    });
  } else if (brandName) {
    const map = makeWordmarkTexture(brandName);
    if (map) {
      brandTexture = map;
      brandMat.map = map;
      brandMat.needsUpdate = true;
      brandMat.opacity = 0.7;
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
  const allowPointer = isDesktopPointer();

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
      camera.setFocalLength(compact ? 42 : immersive ? 40 : 58);
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
      camera.position.set(1.62 + dampX * 0.12, 0.78 + dampY * 0.05, 5.85);
      LOOK_OFFSET.set(0.04 + dampX * 0.05, -0.48, -0.18);
      camera.lookAt(LOOK_OFFSET);
    } else {
      const intro = 1 - Math.exp(-elapsed * 0.72);
      const kick = Math.max(0, 1 - elapsed / 0.72);
      pathAt(scroll, PATH_POS, PATH_TARGET, immersive);
      if (immersive) {
        INTRO_POS.set(0.22, 3.9, 12.6).lerp(PATH_POS, intro);
        INTRO_TARGET.set(0.02, -0.15, -1.7).lerp(PATH_TARGET, intro);
      } else {
        INTRO_POS.set(0.12, 3.2, 9.4).lerp(PATH_POS, intro);
        INTRO_TARGET.set(0, -0.2, -1.2).lerp(PATH_TARGET, intro);
      }
      INTRO_POS.x += dampX * 0.28 + camMom * 0.42;
      INTRO_POS.y += Math.sin(elapsed * 0.1) * 0.025 + Math.cos(elapsed * 32) * kick * 0.016 + camMom * 0.1;
      INTRO_POS.z += Math.sin(elapsed * 38) * kick * 0.02 - Math.abs(camMom) * 0.14;
      camera.position.copy(INTRO_POS);
      look.lerp(INTRO_TARGET, 0.08);
      LOOK_OFFSET.set(look.x + dampX * 0.08, look.y - dampY * 0.06, look.z);
      PREV_QUAT.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK_OFFSET);
      desiredQuat.copy(camera.quaternion);
      camera.quaternion.copy(PREV_QUAT).slerp(desiredQuat, 0.1);
      brandMat.opacity = Math.min(0.72, intro * 0.9);
    }

    const shatterT = compact ? 1 : Math.min(elapsed / 1.7, 1);
    const kick = compact ? 0 : Math.max(0, 1 - elapsed / 0.72);
    key.intensity = 0.92 + kick * 0.1 + Math.abs(camMom) * 0.08;
    windowKey.intensity = (compact ? 1.35 : immersive ? 1.85 : 1.6) + kick * 0.12;
    glass.rotation.y = camMom * 0.08 + dampX * 0.02;
    glass.rotation.x = 0;
    glass.rotation.z = 0;

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const origin = origins[i];
      const vel = velocities[i];
      const spin = spins[i];
      const home = rest[i];
      const delay = (i / SHARD_COUNT) * 0.22;
      const local = smooth(Math.min(1, Math.max(0, (shatterT - delay) / 0.78)));
      const stretch = 1 - local;
      const lift = Math.sin(local * Math.PI) * (0.35 + (i % 3) * 0.06);
      const burstX = origin.x + vel.x * local * (0.55 + stretch);
      const burstY = origin.y + vel.y * local + lift;
      const burstZ = origin.z + vel.z * local;
      dummy.position.set(
        burstX + (home.x - burstX) * local,
        burstY + (home.y - burstY) * local,
        burstZ + (home.z - burstZ) * local,
      );
      dummy.rotation.set(
        spin.x * stretch * 0.55 + home.rx,
        spin.y * stretch * 0.35 + home.ry + elapsed * 0.02,
        spin.z * stretch * 0.28,
      );
      dummy.scale.setScalar(home.s * (0.7 + stretch * 0.45));
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
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
    viewGeo.dispose();
    paneGeo.dispose();
    slitGeo.dispose();
    coolGeo.dispose();
    frameV.dispose();
    frameH.dispose();
    plinthBaseGeo.dispose();
    plinthBodyGeo.dispose();
    plinthCapGeo.dispose();
    shardGeo.dispose();
    pillarGeo.dispose();
    lintelGeo.dispose();
    benchGeo.dispose();
    glassGeo.dispose();
    edgeGeo.dispose();
    railGeo.dispose();
    frameGeo.dispose();
    mediaGeo.dispose();
    brandGeo.dispose();
    contactGeo.dispose();
    wallMat.dispose();
    sideMat.dispose();
    floorMat.dispose();
    ceilingMat.dispose();
    stoneMat.dispose();
    copperMat.dispose();
    glassMat.dispose();
    edgeMat.dispose();
    shardMat.dispose();
    pillarMat.dispose();
    frameMat.dispose();
    mediaMat.dispose();
    brandMat.dispose();
    contactMat.dispose();
    viewMat.dispose();
    paneMat.dispose();
    slitMat.dispose();
    coolMat.dispose();
    contactMap.dispose();
    brandTexture?.dispose();
    mediaTexture?.dispose();
    viewTexture?.dispose();
    gl.dispose();
  };
}

interface ChamberVoidProps {
  logoUrl: string | null;
  brandName: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
  compact?: boolean;
  immersive?: boolean;
  environmentUrl?: string | null;
}

export default function ChamberVoid({
  logoUrl,
  brandName,
  mediaUrl = null,
  mediaKind = null,
  compact = false,
  immersive = false,
  environmentUrl = null,
}: ChamberVoidProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startWorld(
      node,
      logoUrl,
      brandName,
      mediaUrl,
      mediaKind,
      compact,
      immersive,
      environmentUrl,
    );
  }, [logoUrl, brandName, mediaUrl, mediaKind, compact, immersive, environmentUrl]);

  return (
    <div
      ref={hostRef}
      className={`${styles.void} ${compact ? styles.compact : ''}`}
      aria-hidden="true"
    />
  );
}
