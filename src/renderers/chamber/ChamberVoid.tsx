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
  ShaderMaterial,
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

const SHARD_COUNT = 21;

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
  float fresnel = pow(1.0 - abs(dot(n, v)), 2.35);
  vec3 light = normalize(vec3(-0.32, 0.88, 0.38));
  float spec = pow(max(dot(n, light), 0.0), 72.0);
  vec3 edge = vec3(0.96, 0.93, 0.86);
  vec3 color = edge * (fresnel * 0.92 + spec * 1.15);
  float alpha = clamp(0.06 + fresnel * 0.82 + spec * 0.55, 0.0, 1.0);
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
  scene.fog = new Fog(0x050506, compact ? 7.2 : 6.4, compact ? 16 : 15);

  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(36, 1, 0.1, 80);
  camera.setFocalLength(50);
  camera.position.set(0, compact ? 0.22 : 3.6, compact ? 3.28 : 8.4);
  const look = new Vector3(compact ? 0.06 : 0, compact ? -1.08 : -1.05, 0.04);
  camera.lookAt(look);
  const desiredQuat = new Quaternion().copy(camera.quaternion);

  const wallMat = new MeshStandardMaterial({
    color: 0x121214,
    roughness: 0.92,
    metalness: 0.06,
    envMapIntensity: 0.35,
  });
  const floorMat = new MeshPhysicalMaterial({
    color: 0x070708,
    roughness: 0.06,
    metalness: 0.88,
    envMapIntensity: 1.55,
  });
  const low = compact || mobile;
  const coreMat = new MeshPhysicalMaterial({
    color: 0x2a2722,
    roughness: 0.32,
    metalness: 0.42,
    envMapIntensity: 0.7,
  });
  const crystalMat = new MeshPhysicalMaterial({
    color: low ? 0xcfc6b8 : 0xe8e0d4,
    roughness: low ? 0.055 : 0.022,
    metalness: 0,
    transmission: low ? 0.78 : 0.96,
    thickness: low ? 0.72 : 1.18,
    ior: 1.52,
    attenuationColor: new Color(0xcec1ad),
    attenuationDistance: low ? 2.2 : 4.4,
    specularIntensity: 1,
    envMapIntensity: 2.35,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    iridescence: 0.08,
    iridescenceIOR: 1.31,
    iridescenceThicknessRange: [80, 280],
  });
  if ('dispersion' in crystalMat) {
    (crystalMat as MeshPhysicalMaterial & { dispersion: number }).dispersion = low ? 0.05 : 0.12;
  }

  const wallGeo = new PlaneGeometry(11, 7);
  const floorGeo = new PlaneGeometry(14, 14);
  const back = new Mesh(wallGeo, wallMat);
  back.position.z = -3.4;
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.05;
  scene.add(back, floor);

  const ambient = new AmbientLight(0xe7e2d6, 0.06);
  const hemi = new HemisphereLight(0xf7f2e8, 0x08080a, 0.38);
  const key = new DirectionalLight(0xfff8ee, 1.82);
  key.position.set(-2.6, 5.2, 3.2);
  const fill = new DirectionalLight(0x8a9aaa, 0.22);
  fill.position.set(3.8, 0.4, 2.6);
  const rim = new PointLight(0xf8f1e4, 1.15, 8.2, 1.7);
  rim.position.set(1.35, -0.05, -1.15);
  const edge = new PointLight(0xfff6ea, 0.55, 5.5, 2);
  edge.position.set(-0.85, -0.4, 1.35);
  const burst = new PointLight(0xfff1d6, compact ? 0.16 : 0, 8, 1.6);
  burst.position.set(0, -0.85, 0.2);
  scene.add(ambient, hemi, key, fill, rim, edge, burst);

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

  const causticMap = makeContactTexture();
  const causticMat = new MeshBasicMaterial({
    map: causticMap,
    color: 0xe8dcc6,
    transparent: true,
    opacity: 0.22,
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
  architecture.visible = !compact;
  scene.add(architecture);

  const crystalGeo = new IcosahedronGeometry(0.76, 1);
  const coreGeo = new IcosahedronGeometry(0.38, 1);
  const crystal = new Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, -1.18, 0.08);
  const core = new Mesh(coreGeo, coreMat);
  core.position.copy(crystal.position);
  const rimMat = new ShaderMaterial({
    vertexShader: FRESNEL_VERT,
    fragmentShader: FRESNEL_FRAG,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const rimShell = new Mesh(crystalGeo, rimMat);
  rimShell.position.copy(crystal.position);
  rimShell.scale.setScalar(1.018);
  scene.add(core, crystal, rimShell);

  const shardMat = new MeshPhysicalMaterial({
    color: 0xcfc4b0,
    roughness: 0.28,
    metalness: 0.38,
    envMapIntensity: 0.95,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });
  const shardGeo = new TetrahedronGeometry(0.15, 0);
  const shards = new InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const dummy = new Object3D();
  const rand = mulberry32(0xc4a4be4);
  const origins: Vector3[] = [];
  const velocities: Vector3[] = [];
  const spins: Vector3[] = [];
  const rest: Array<{ x: number; y: number; z: number; rx: number; ry: number; s: number }> = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const t = i / Math.max(1, SHARD_COUNT - 1);
    const angle = -0.98 + t * 1.96;
    const radius = 0.86 + (i % 3) * 0.15;
    rest.push({
      x: Math.sin(angle) * radius * 1.18,
      y: -1.96,
      z: 0.58 + Math.cos(angle) * radius * 0.32,
      rx: 0.32 * (i % 5) + (rand() - 0.5) * 0.12,
      ry: angle + (i % 4) * 0.1,
      s: 0.34 + (i % 5) * 0.05,
    });
    origins.push(new Vector3(0, -1.18, 0.08));
    velocities.push(
      new Vector3(Math.sin(angle) * 1.65, 0.48 + (i % 5) * 0.07, 0.55 + Math.cos(angle) * 0.35),
    );
    spins.push(new Vector3((i % 3) - 1, (i % 5) - 2, ((i % 4) - 1.5) * 0.8));
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
      camera.position.set(0.52 + dampX * 0.08, 0.18, 3.18);
      LOOK_OFFSET.set(0.04, -1.1, 0.04);
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

    const shatterT = compact ? 1 : Math.min(elapsed / 1.35, 1);
    const settle = shatterT * shatterT * (3 - 2 * shatterT);
    const kick = compact ? 0 : Math.max(0, 1 - elapsed / 0.58);
    burst.intensity = compact ? 0.16 : 2.4 * Math.exp(-elapsed * 2.4) + 0.08;
    key.intensity = 1.82 + kick * 0.45;
    crystal.rotation.y = elapsed * 0.08;
    crystal.rotation.x = Math.sin(elapsed * 0.16) * 0.05;
    crystal.scale.setScalar(0.52 + settle * 0.48);
    core.rotation.copy(crystal.rotation);
    core.scale.copy(crystal.scale);
    rimShell.rotation.copy(crystal.rotation);
    rimShell.scale.setScalar(crystal.scale.x * 1.018);

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const origin = origins[i];
      const vel = velocities[i];
      const spin = spins[i];
      const home = rest[i];
      const delay = (i / SHARD_COUNT) * 0.2;
      const local = smooth(Math.min(1, Math.max(0, (shatterT - delay) / 0.8)));
      const stretch = 1 - local;
      const burstX = origin.x + vel.x * local;
      const burstY = origin.y + vel.y * local - 1.8 * local * local;
      const burstZ = origin.z + vel.z * local;
      dummy.position.set(
        burstX + (home.x - burstX) * local,
        burstY + (home.y - burstY) * local,
        burstZ + (home.z - burstZ) * local,
      );
      dummy.rotation.set(
        spin.x * stretch * 0.55 + home.rx,
        spin.y * stretch * 0.4 + home.ry + elapsed * 0.03,
        spin.z * stretch * 0.28,
      );
      dummy.scale.setScalar(home.s * (0.7 + stretch * 0.55));
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
    coreGeo.dispose();
    frameGeo.dispose();
    mediaGeo.dispose();
    brandGeo.dispose();
    contactGeo.dispose();
    wallMat.dispose();
    floorMat.dispose();
    crystalMat.dispose();
    coreMat.dispose();
    rimMat.dispose();
    shardMat.dispose();
    pillarMat.dispose();
    frameMat.dispose();
    mediaMat.dispose();
    brandMat.dispose();
    contactMat.dispose();
    causticMat.dispose();
    contactMap.dispose();
    causticMap.dispose();
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
