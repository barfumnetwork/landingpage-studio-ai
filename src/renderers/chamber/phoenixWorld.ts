import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  type Texture,
  TextureLoader,
} from 'three';
import {
  createRendererRuntime,
  createStudioEnvironment,
  isDesktopPointer,
} from '../shared/createRendererRuntime';
import { readScrollProgress } from '../shared/scrollProgress';
import { createPhoenixRig } from './phoenixGeometry';
import styles from './ChamberVoid.module.css';

type CameraKey = {
  t: number;
  px: number;
  py: number;
  pz: number;
  lx: number;
  ly: number;
  lz: number;
};

const PHOENIX_PATH: CameraKey[] = [
  { t: 0, px: 0.2, py: 2.4, pz: -16.5, lx: 0, ly: 2.2, lz: -16.5 },
  { t: 0.16, px: -1.4, py: 4.2, pz: -8.4, lx: -1.4, ly: 4.0, lz: -8.4 },
  { t: 0.32, px: 5.2, py: 2.6, pz: -1.8, lx: 5.2, ly: 2.4, lz: -1.8 },
  { t: 0.5, px: -3.1, py: 1.8, pz: 3.4, lx: -3.1, ly: 1.7, lz: 3.4 },
  { t: 0.68, px: 1.8, py: 4.6, pz: -3.2, lx: 1.8, ly: 4.4, lz: -3.2 },
  { t: 1, px: 0.15, py: 3.1, pz: -7.2, lx: 0.15, ly: 2.9, lz: -7.2 },
];

const CAMERA_PATH: CameraKey[] = [
  { t: 0, px: 1.8, py: 5.4, pz: 14.8, lx: 0.2, ly: 2.6, lz: -16.2 },
  { t: 0.16, px: -0.2, py: 0.35, pz: -1.6, lx: -1.2, ly: 4.4, lz: -8.2 },
  { t: 0.32, px: -2.4, py: 2.8, pz: 1.1, lx: 4.8, ly: 2.5, lz: -1.6 },
  { t: 0.5, px: -1.2, py: 2.4, pz: 6.4, lx: -2.6, ly: 1.2, lz: 2.8 },
  { t: 0.72, px: 2.8, py: 1.15, pz: 1.6, lx: 0.4, ly: 0.4, lz: -0.2 },
  { t: 1, px: 0.4, py: 6.2, pz: 15.6, lx: 0.2, ly: 3.0, lz: -7.0 },
];

const TMP_A = new Vector3();
const TMP_B = new Vector3();
const LOOK = new Vector3();
const PREV_Q = new Quaternion();
const NEXT_Q = new Quaternion();
const DUMMY = new Object3D();

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function sample(keys: CameraKey[], scroll: number, position: Vector3, target: Vector3): void {
  const t = smooth(scroll);
  let from = keys[0];
  let to = keys[1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
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
  const u = smooth((t - from.t) / Math.max(to.t - from.t, 0.0001));
  position.set(lerp(from.px, to.px, u), lerp(from.py, to.py, u), lerp(from.pz, to.pz, u));
  target.set(lerp(from.lx, to.lx, u), lerp(from.ly, to.ly, u), lerp(from.lz, to.lz, u));
}

function makeSparkleGeo(): PlaneGeometry {
  return new PlaneGeometry(0.07, 0.12);
}

export function startPhoenixWorld(
  node: HTMLDivElement,
  compact: boolean,
  immersive: boolean,
  environmentUrl: string | null,
): (() => void) | undefined {
  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: true,
    alpha: false,
    desktopDpr: compact ? 1.2 : immersive ? 1.6 : 1.45,
    mobileDpr: compact ? 1 : 1.15,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;

  const scene = new Scene();
  const bg = new Color(0x14131a);
  scene.background = bg;
  scene.fog = new Fog(0x16141e, compact ? 7 : 11, compact ? 18 : 36);

  const env = createStudioEnvironment(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(compact ? 32 : immersive ? 36 : 30, 1, 0.12, 80);
  camera.setFocalLength(compact ? 48 : immersive ? 42 : 56);
  camera.position.set(compact ? 2.4 : 1.8, compact ? 1.4 : 5.4, compact ? 6.2 : 14.8);
  camera.lookAt(0, 1.1, -2);

  const hemi = new HemisphereLight(0x7a96aa, 0x2a2018, compact ? 0.42 : 0.55);
  const ambient = new AmbientLight(0x1c1824, 0.28);
  const key = new DirectionalLight(0xffc878, compact ? 1.05 : 1.45);
  key.position.set(-5.2, 9.4, 6.2);
  const fill = new DirectionalLight(0x7aa0c8, 0.38);
  fill.position.set(7.4, 2.2, -5.2);
  const rim = new PointLight(0xe8d4b0, compact ? 0.55 : 0.9, 18, 1.6);
  scene.add(hemi, ambient, key, fill, rim);

  const groundGeo = new PlaneGeometry(48, 48);
  const groundMat = new MeshStandardMaterial({
    color: 0x16141c,
    roughness: 0.72,
    metalness: 0.18,
    envMapIntensity: 0.45,
  });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.6;
  scene.add(ground);

  const slabGeo = new PlaneGeometry(1.1, 9.5);
  const slabMat = createSlabMaterial(compact);
  const architecture = new Group();
  const slabPlaces = [
    [-9.5, 1.2, -12],
    [11.2, 0.6, -14],
    [-6.2, 2.4, -20],
    [8.4, 1.8, -18],
    [0.6, 3.2, -24],
  ] as const;
  for (const [x, y, z] of slabPlaces) {
    const slab = new Mesh(slabGeo, slabMat);
    slab.position.set(x, y, z);
    slab.rotation.y = x < 0 ? 0.4 : -0.35;
    architecture.add(slab);
  }
  scene.add(architecture);

  const phoenix = createPhoenixRig(compact);
  scene.add(phoenix.root);
  rim.position.copy(phoenix.root.position);

  const sparkleCount = compact ? 28 : 72;
  const sparkleGeo = makeSparkleGeo();
  const sparkleMat = new MeshStandardMaterial({
    color: 0xe8dcc4,
    roughness: 0.22,
    metalness: 0.3,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const sparkles = new InstancedMesh(sparkleGeo, sparkleMat, sparkleCount);
  for (let i = 0; i < sparkleCount; i += 1) {
    const t = i / sparkleCount;
    DUMMY.position.set(
      Math.sin(i * 1.7) * (3.4 + t * 6),
      0.4 + Math.cos(i * 0.9) * 2.6 + t * 1.8,
      -14 + t * 18 + Math.sin(i * 0.6) * 1.4,
    );
    DUMMY.rotation.set(i * 0.4, i * 0.2, i * 0.15);
    DUMMY.scale.setScalar(0.45 + (i % 5) * 0.12);
    DUMMY.updateMatrix();
    sparkles.setMatrixAt(i, DUMMY.matrix);
  }
  scene.add(sparkles);

  let viewTexture: Texture | null = null;
  if (environmentUrl && !compact) {
    const loader = new TextureLoader();
    const cycGeo = new PlaneGeometry(28, 16);
    const cycMat = new MeshBasicMaterial({ color: 0x9a8a78, transparent: true, opacity: 0.22 });
    const cyclorama = new Mesh(cycGeo, cycMat);
    cyclorama.position.set(0, 4.2, -26);
    scene.add(cyclorama);
    loader.load(environmentUrl, (map) => {
      viewTexture = map;
      map.colorSpace = SRGBColorSpace;
      cycMat.map = map;
      cycMat.color.set(0xffffff);
      cycMat.needsUpdate = true;
    });
    gl.track({
      dispose() {
        cycGeo.dispose();
        cycMat.dispose();
      },
    });
  }

  const phoenixPos = new Vector3();
  const phoenixLook = new Vector3();
  const camPos = new Vector3();
  const camLook = new Vector3();
  const featherWorld = new Vector3();
  const featherOrigin = new Vector3();
  let featherReleased = false;

  let raf = 0;
  let elapsed = compact ? 0.8 : 0;
  let last = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let dampX = 0;
  let dampY = 0;
  let scroll = 0;
  let scrollPrev = 0;
  let scrollVel = 0;
  let lastAspect = 0;
  const allowPointer = isDesktopPointer();

  function onPointer(event: PointerEvent): void {
    if (!allowPointer) return;
    const rect = node.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  }

  node.addEventListener('pointermove', onPointer, { passive: true });

  function tick(now: number): void {
    raf = window.requestAnimationFrame(tick);
    if (!gl.isRunning()) return;
    const delta = Math.min((now - last) / 1000, 0.048);
    last = now;
    elapsed += delta;

    const width = node.clientWidth || 1;
    const height = node.clientHeight || 1;
    const aspect = width / height;
    if (aspect !== lastAspect) {
      lastAspect = aspect;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      camera.setFocalLength(compact ? 48 : immersive ? 42 : 56);
    }

    dampX += (pointerX - dampX) * 0.05;
    dampY += (pointerY - dampY) * 0.05;
    const rawScroll = compact ? 0.12 : readScrollProgress(node);
    const instVel = (rawScroll - scrollPrev) / Math.max(delta, 0.001);
    scrollPrev = rawScroll;
    scrollVel += (instVel - scrollVel) * 0.16;
    scrollVel *= Math.exp(-3.2 * delta);
    if (!compact) scroll += (rawScroll - scroll) * 0.068;
    else scroll = 0.12;

    sample(PHOENIX_PATH, scroll, phoenixPos, TMP_A);
    sample(PHOENIX_PATH, Math.min(1, scroll + 0.05), phoenixLook, TMP_B);
    const bob = Math.sin(elapsed * 0.85) * 0.08;
    phoenix.root.position.set(phoenixPos.x, phoenixPos.y + bob, phoenixPos.z);
    phoenix.root.lookAt(phoenixLook.x, phoenixLook.y + bob, phoenixLook.z);
    const bank = Math.max(-0.32, Math.min(0.32, scrollVel * 0.08 + dampX * 0.12));
    phoenix.root.rotation.z += (-bank - phoenix.root.rotation.z) * 0.08;

    const beat = Math.sin(elapsed * 1.22);
    const open = compact ? 0.72 : smooth(Math.min(1, scroll / 0.22));
    phoenix.leftWing.rotation.z = 0.18 + beat * 0.38 * (0.55 + open * 0.45);
    phoenix.rightWing.rotation.z = -0.18 - beat * 0.38 * (0.55 + open * 0.45);
    phoenix.leftWing.rotation.y = beat * 0.05;
    phoenix.rightWing.rotation.y = -beat * 0.05;
    phoenix.tail.rotation.x = 0.12 + Math.sin(elapsed * 0.9) * 0.06;
    for (let i = 0; i < phoenix.feathers.length; i += 1) {
      const feather = phoenix.feathers[i];
      if (!feather || feather === phoenix.detached) continue;
      feather.rotation.x += Math.sin(elapsed * 1.22 - i * 0.09) * 0.002;
    }

    const featherU = smooth((scroll - 0.46) / 0.3);
    if (!compact && featherU > 0 && !featherReleased) {
      phoenix.detached.updateWorldMatrix(true, false);
      phoenix.detached.getWorldPosition(featherOrigin);
      scene.attach(phoenix.detached);
      featherReleased = true;
    }
    if (featherReleased) {
      const u = Math.min(1, Math.max(0, featherU));
      const sCurve = Math.sin(u * Math.PI * 2) * 0.72;
      const fall = u * u * 4.4;
      featherWorld.set(
        featherOrigin.x + sCurve,
        featherOrigin.y - fall + Math.sin(u * Math.PI) * 0.35,
        featherOrigin.z + Math.cos(u * Math.PI) * 0.85,
      );
      phoenix.detached.position.lerp(featherWorld, 0.14);
      phoenix.detached.rotation.y = u * Math.PI * 2.05;
      phoenix.detached.rotation.z = Math.sin(u * Math.PI * 3) * 0.45;
      phoenix.detached.rotation.x = 0.4 + u * 0.8;
    }

    sample(CAMERA_PATH, scroll, camPos, camLook);
    if (!compact && scroll > 0.46 && scroll < 0.78 && featherReleased) {
      const mix = smooth((scroll - 0.46) / 0.16);
      camLook.lerp(phoenix.detached.position, mix * 0.92);
      camPos.x = lerp(camPos.x, phoenix.detached.position.x + 1.4, mix * 0.55);
      camPos.y = lerp(camPos.y, phoenix.detached.position.y + 0.7, mix * 0.4);
    }
    if (compact) {
      camera.position.set(2.35 + dampX * 0.18, 1.28 + dampY * 0.08, 5.9);
      LOOK.set(0.05, 0.85, -0.4);
      camera.lookAt(LOOK);
    } else {
      camPos.x += dampX * 0.35;
      camPos.y += dampY * 0.12 + Math.sin(elapsed * 0.12) * 0.03;
      camera.position.lerp(camPos, 1 - Math.exp(-2.4 * delta));
      LOOK.lerp(camLook, 0.09);
      PREV_Q.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(LOOK);
      NEXT_Q.copy(camera.quaternion);
      camera.quaternion.copy(PREV_Q).slerp(NEXT_Q, 0.09);
    }

    rim.position.copy(phoenix.root.position);
    rim.position.y += 0.8;
    key.intensity = compact ? 1.05 : 1.28 + Math.abs(scrollVel) * 0.05;

    for (let i = 0; i < sparkleCount; i += 1) {
      const t = i / sparkleCount;
      DUMMY.position.set(
        Math.sin(i * 1.7 + elapsed * 0.15) * (3.4 + t * 6),
        0.4 + Math.cos(i * 0.9 + elapsed * 0.12) * 2.6 + t * 1.8,
        -14 + t * 18 + Math.sin(i * 0.6 + elapsed * 0.08) * 1.4,
      );
      DUMMY.rotation.set(i * 0.4 + elapsed * 0.2, i * 0.2, i * 0.15);
      DUMMY.scale.setScalar(0.4 + (i % 5) * 0.12);
      DUMMY.updateMatrix();
      sparkles.setMatrixAt(i, DUMMY.matrix);
    }
    sparkles.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    node.removeEventListener('pointermove', onPointer);
    phoenix.geometries.forEach((geo) => geo.dispose());
    phoenix.materials.forEach((mat) => mat.dispose());
    groundGeo.dispose();
    groundMat.dispose();
    slabGeo.dispose();
    slabMat.dispose();
    sparkleGeo.dispose();
    sparkleMat.dispose();
    sparkles.dispose();
    viewTexture?.dispose();
    gl.dispose();
  };
}

function createSlabMaterial(compact: boolean): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: 0xc9d2da,
    roughness: 0.16,
    metalness: 0.18,
    envMapIntensity: 0.9,
    transparent: true,
    opacity: compact ? 0.18 : 0.28,
    depthWrite: false,
  });
}
