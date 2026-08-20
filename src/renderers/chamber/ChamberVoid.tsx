import { useEffect, useRef } from 'react';
import {
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

const SHARD_COUNT = 48;

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

function pathAt(scroll: number, position: Vector3, target: Vector3): void {
  const t = smooth(Math.min(1, Math.max(0, scroll)));
  if (t < 0.5) {
    const u = t / 0.5;
    position.set(lerp(0.08, 1.42, u), lerp(0.42, -0.12, u), lerp(5.15, 2.86, u));
    target.set(lerp(0, 0.06, u), lerp(-1.02, -1.12, u), lerp(0.05, -0.12, u));
    return;
  }
  const u = (t - 0.5) / 0.5;
  position.set(lerp(1.42, -0.48, u), lerp(-0.12, -0.55, u), lerp(2.86, 2.18, u));
  target.set(lerp(0.06, 0.16, u), lerp(-1.12, -0.78, u), lerp(-0.12, -0.42, u));
}

function makeContactTexture(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const map = new Texture(canvas);
  if (!ctx) return map;
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
  gradient.addColorStop(0.38, 'rgba(0, 0, 0, 0.28)');
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
    antialias: !compact,
    alpha: false,
    desktopDpr: compact ? 1 : 1.5,
    mobileDpr: compact ? 1 : 1.15,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  const scene = new Scene();
  scene.background = new Color(0x050506);
  scene.fog = new Fog(0x050506, compact ? 3.6 : 5.4, compact ? 11 : 14);

  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(36, 1, 0.1, 80);
  camera.setFocalLength(50);
  camera.position.set(0, compact ? -0.28 : 3.6, compact ? 2.55 : 8.4);
  const look = new Vector3(0, compact ? -1.12 : -1.05, 0.04);
  camera.lookAt(look);
  const desiredQuat = new Quaternion().copy(camera.quaternion);

  const wallMat = new MeshStandardMaterial({
    color: 0x121214,
    roughness: 0.92,
    metalness: 0.06,
    envMapIntensity: 0.35,
  });
  const floorMat = new MeshPhysicalMaterial({
    color: 0x09090b,
    roughness: 0.08,
    metalness: 0.84,
    envMapIntensity: 1.35,
  });
  const low = compact || mobile;
  const crystalMat = new MeshPhysicalMaterial({
    color: 0xf3eee4,
    roughness: low ? 0.08 : 0.035,
    metalness: 0.0,
    transmission: 1,
    thickness: low ? 0.62 : 0.94,
    ior: 1.5,
    attenuationColor: new Color(0xe4d8c6),
    attenuationDistance: low ? 1.2 : 2.2,
    specularIntensity: 1,
    envMapIntensity: 2.1,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    iridescence: low ? 0.12 : 0.22,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 380],
  });
  if ('dispersion' in crystalMat) {
    (crystalMat as MeshPhysicalMaterial & { dispersion: number }).dispersion = low ? 0.04 : 0.08;
  }

  const wallGeo = new PlaneGeometry(11, 7);
  const floorGeo = new PlaneGeometry(14, 14);
  const back = new Mesh(wallGeo, wallMat);
  back.position.z = -3.4;
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.05;
  scene.add(back, floor);

  const ambient = new AmbientLight(0xe7e2d6, 0.1);
  const hemi = new HemisphereLight(0xf7f2e8, 0x0b0b0e, 0.48);
  const key = new DirectionalLight(0xfff6ea, 1.55);
  key.position.set(-2.8, 4.8, 3.6);
  const fill = new DirectionalLight(0x8a96a6, 0.32);
  fill.position.set(3.6, 0.6, 2.4);
  const rim = new PointLight(0xf8f1e4, 0.7, 7.5, 1.8);
  rim.position.set(1.15, -0.2, -1.35);
  const burst = new PointLight(0xfff1d6, compact ? 0.22 : 0, 8, 1.6);
  burst.position.set(0, -0.85, 0.2);
  scene.add(ambient, hemi, key, fill, rim, burst);

  const contactMap = makeContactTexture();
  const contactGeo = new CircleGeometry(1.7, 48);
  const contactMat = new MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const contact = new Mesh(contactGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0, -2.035, 0.08);
  scene.add(contact);

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
  architecture.visible = !compact;
  scene.add(architecture);

  const crystalGeo = new IcosahedronGeometry(0.74, 1);
  const crystal = new Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, -1.18, 0.08);
  scene.add(crystal);

  const shardMat = new MeshPhysicalMaterial({
    color: 0xd4cbb8,
    roughness: 0.22,
    metalness: 0.42,
    envMapIntensity: 0.85,
  });
  const shardGeo = new TetrahedronGeometry(0.22, 0);
  const shards = new InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const dummy = new Object3D();
  const rand = mulberry32(0xc4a4be4);
  const origins: Vector3[] = [];
  const velocities: Vector3[] = [];
  const spins: Vector3[] = [];
  const rest: Array<{ x: number; y: number; z: number; rx: number; ry: number }> = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const angle = (i / SHARD_COUNT) * Math.PI * 2;
    const radius = 1.05 + (i % 5) * 0.08;
    rest.push({
      x: Math.cos(angle) * radius,
      y: -1.72 + (i % 7) * 0.05,
      z: Math.sin(angle) * radius * 0.55 - 0.35,
      rx: 0.2 * (i % 4) + (rand() - 0.5) * 0.4,
      ry: angle + (rand() - 0.5) * 0.4,
    });
    origins.push(new Vector3((rand() - 0.5) * 0.22, 0.4 + rand() * 0.4, 0.08));
    velocities.push(
      new Vector3((rand() - 0.5) * 6.4, 2.2 + rand() * 4.6, (rand() - 0.5) * 3.2 - 1.4),
    );
    spins.push(new Vector3((rand() - 0.5) * 9, (rand() - 0.5) * 12, (rand() - 0.5) * 7));
  }
  shards.visible = !compact;
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
  let elapsed = compact ? 2.4 : 0;
  let last = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let dampX = 0;
  let dampY = 0;
  let scroll = 0;
  const allowPointer = !compact && isDesktopPointer();
  let lastAspect = 0;

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

  if (!compact) {
    node.addEventListener('pointermove', onPointer, { passive: true });
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
      camera.setFocalLength(50);
    }
    dampX += (pointerX - dampX) * 0.045;
    dampY += (pointerY - dampY) * 0.045;
    if (!compact) scroll += (readScrollProgress(node) - scroll) * 0.06;

    if (compact) {
      camera.position.set(0.18 + dampX * 0.08, -0.32, 2.42);
      LOOK_OFFSET.set(0.02, -1.14, 0.04);
      camera.lookAt(LOOK_OFFSET);
    } else {
      const intro = 1 - Math.exp(-elapsed * 0.9);
      const kick = Math.max(0, 1 - elapsed / 0.58);
      pathAt(scroll, PATH_POS, PATH_TARGET);
      INTRO_POS.set(0, 3.6, 8.4).lerp(PATH_POS, intro);
      INTRO_TARGET.set(0, -1.2, -0.2).lerp(PATH_TARGET, intro);
      INTRO_POS.x += dampX * 0.32;
      INTRO_POS.y += Math.sin(elapsed * 0.11) * 0.03 + Math.cos(elapsed * 38) * kick * 0.03;
      INTRO_POS.z += Math.sin(elapsed * 46) * kick * 0.04;
      camera.position.copy(INTRO_POS);
      look.lerp(INTRO_TARGET, 0.08);
      LOOK_OFFSET.set(look.x + dampX * 0.1, look.y - dampY * 0.08, look.z);
      PREV_QUAT.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK_OFFSET);
      desiredQuat.copy(camera.quaternion);
      camera.quaternion.copy(PREV_QUAT).slerp(desiredQuat, 0.14);
      brandMat.opacity = Math.min(0.88, intro * 1.1);
    }

    const shatterT = compact ? 1 : Math.min(elapsed / 1.22, 1);
    const settle = shatterT * shatterT * (3 - 2 * shatterT);
    const stretch = 1 - settle;
    const kick = compact ? 0 : Math.max(0, 1 - elapsed / 0.58);
    burst.intensity = compact ? 0.18 : 2.4 * Math.exp(-elapsed * 2.4) + 0.08;
    key.intensity = 1.55 + kick * 0.55;
    crystal.rotation.y = elapsed * 0.1;
    crystal.rotation.x = Math.sin(elapsed * 0.18) * 0.06;
    crystal.scale.setScalar(0.42 + settle * 0.58);

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const origin = origins[i];
      const vel = velocities[i];
      const spin = spins[i];
      const home = rest[i];
      const burstX = origin.x + vel.x * shatterT;
      const burstY = origin.y + vel.y * shatterT - 4.6 * shatterT * shatterT;
      const burstZ = origin.z + vel.z * shatterT;
      dummy.position.set(
        burstX + (home.x - burstX) * settle,
        burstY + (home.y - burstY) * settle,
        burstZ + (home.z - burstZ) * settle,
      );
      dummy.rotation.set(
        spin.x * stretch * 0.4 + home.rx,
        spin.y * stretch * 0.48 + home.ry + elapsed * 0.08,
        spin.z * stretch * 0.24,
      );
      dummy.scale.setScalar(0.55 + stretch * 0.7);
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    if (!compact) {
      node.removeEventListener('pointermove', onPointer);
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
    shardMat.dispose();
    pillarMat.dispose();
    frameMat.dispose();
    mediaMat.dispose();
    brandMat.dispose();
    contactMat.dispose();
    contactMap.dispose();
    brandTexture?.dispose();
    mediaTexture?.dispose();
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
