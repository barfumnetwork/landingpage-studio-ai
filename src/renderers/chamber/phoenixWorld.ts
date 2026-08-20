import {
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Quaternion,
  Scene,
  Vector3,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { createRendererRuntime, isDesktopPointer } from '../shared/createRendererRuntime';
import { readScrollProgress } from '../shared/scrollProgress';
import { createPhoenixRig } from './phoenixGeometry';
import { createGlassMaterial } from './phoenixGlass';
import styles from './ChamberVoid.module.css';

type Shot = {
  t: number;
  x: number;
  y: number;
  z: number;
};

const FLIGHT: Shot[] = [
  { t: 0, x: 0.28, y: 1.15, z: -0.55 },
  { t: 0.16, x: -0.55, y: 1.85, z: 0.15 },
  { t: 0.32, x: 0.95, y: 1.35, z: 1.15 },
  { t: 0.5, x: -0.42, y: 1.42, z: 1.45 },
  { t: 0.68, x: 0.7, y: 1.72, z: 0.45 },
  { t: 1, x: 0.18, y: 1.28, z: -0.25 },
];

const CAMERA: Shot[] = [
  { t: 0, x: -2.8, y: 0.15, z: 5.2 },
  { t: 0.16, x: -1.85, y: -1.35, z: 4.8 },
  { t: 0.32, x: -4.2, y: 0.55, z: 4.1 },
  { t: 0.5, x: 1.15, y: 0.48, z: 3.15 },
  { t: 0.68, x: 2.85, y: 0.62, z: 3.35 },
  { t: 0.88, x: -2.55, y: 1.25, z: 6.8 },
  { t: 1, x: -2.15, y: 0.95, z: 6.4 },
];

const LOOK: Shot[] = [
  { t: 0, x: 0.35, y: 0.18, z: -0.42 },
  { t: 0.16, x: 0.2, y: 0.32, z: -0.22 },
  { t: 0.32, x: 0.85, y: 0.1, z: 0.12 },
  { t: 0.5, x: 0.12, y: 0.08, z: 0.04 },
  { t: 0.68, x: 0.16, y: 0.06, z: 0.08 },
  { t: 0.88, x: 0.24, y: 0.22, z: -0.16 },
  { t: 1, x: 0.18, y: 0.16, z: -0.14 },
];

const TMP = new Vector3();
const TMP_B = new Vector3();
const AIM = new Vector3();
const PREV_Q = new Quaternion();
const NEXT_Q = new Quaternion();
const BOX = new Box3();
const SIZE = new Vector3();

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function sampleShot(keys: Shot[], scroll: number, out: Vector3): void {
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
  out.set(lerp(from.x, to.x, u), lerp(from.y, to.y, u), lerp(from.z, to.z, u));
}

function readSilhouetteFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as Window & { __PHOENIX_SILHOUETTE__?: boolean };
  if (w.__PHOENIX_SILHOUETTE__) return true;
  try {
    return new URLSearchParams(window.location.search).get('phoenix') === 'silhouette';
  } catch {
    return false;
  }
}

function isPortraitHost(node: HTMLDivElement): boolean {
  const width = node.clientWidth || window.innerWidth;
  const height = node.clientHeight || window.innerHeight;
  return height > width * 1.08;
}

function wingCycle(scroll: number): { dihedral: number; fold: number; sweep: number } {
  const keys = [
    { t: 0, dihedral: 0.08, fold: 0.06, sweep: 0.04 },
    { t: 0.18, dihedral: 0.22, fold: 0.0, sweep: -0.04 },
    { t: 0.4, dihedral: 0.04, fold: 0.1, sweep: 0.08 },
    { t: 0.62, dihedral: -0.12, fold: 0.22, sweep: 0.16 },
    { t: 0.82, dihedral: 0.1, fold: 0.05, sweep: 0.02 },
    { t: 1, dihedral: 0.08, fold: 0.06, sweep: 0.04 },
  ];
  let from = keys[0]!;
  let to = keys[1]!;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (scroll >= a.t && scroll <= b.t) {
      from = a;
      to = b;
      break;
    }
    from = a;
    to = b;
  }
  const u = smooth((scroll - from.t) / Math.max(to.t - from.t, 0.0001));
  return {
    dihedral: lerp(from.dihedral, to.dihedral, u),
    fold: lerp(from.fold, to.fold, u),
    sweep: lerp(from.sweep, to.sweep, u),
  };
}

function restX(obj: Object3D): number {
  return typeof obj.userData.restX === 'number' ? obj.userData.restX : obj.rotation.x;
}

function restY(obj: Object3D): number {
  return typeof obj.userData.restY === 'number' ? obj.userData.restY : obj.rotation.y;
}

function restZ(obj: Object3D): number {
  return typeof obj.userData.restZ === 'number' ? obj.userData.restZ : obj.rotation.z;
}

function keepInFrame(
  camera: PerspectiveCamera,
  root: Object3D,
  camPos: Vector3,
  look: Vector3,
  portrait: boolean,
): void {
  BOX.setFromObject(root);
  BOX.getSize(SIZE);
  const height = Math.max(SIZE.y, SIZE.x * 0.55, 1.2);
  const fill = portrait ? 0.64 : 0.54;
  const vFov = (camera.fov * Math.PI) / 180;
  const need = height / (2 * Math.tan(vFov * 0.5) * fill);
  const delta = camPos.clone().sub(look);
  const dist = delta.length();
  if (dist < need) {
    if (dist < 0.2) delta.set(camPos.x - look.x, 0.2, Math.max(2.4, need));
    delta.setLength(need);
    camPos.copy(look).add(delta);
  }
}

export function startPhoenixWorld(
  node: HTMLDivElement,
  compact: boolean,
  immersive: boolean,
  environmentUrl: string | null,
): (() => void) | undefined {
  void environmentUrl;
  const silhouette = readSilhouetteFlag();
  const portrait = !compact && isPortraitHost(node);

  if (silhouette) {
    document.documentElement.dataset.phoenixSilhouette = '1';
    node.classList.add(styles.silhouette);
  }

  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: true,
    alpha: false,
    desktopDpr: compact ? 1 : immersive ? 1.5 : 1.35,
    mobileDpr: compact ? 1 : 1.12,
    compact,
    toneMapping: silhouette ? 'none' : 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  renderer.toneMappingExposure = silhouette ? 1 : compact ? 1.0 : 0.9;

  const scene = new Scene();
  if (silhouette) {
    scene.background = new Color(0x7a7a7a);
    scene.fog = null;
  } else {
    scene.background = new Color(0x151311);
    scene.fog = new Fog(0x1c1814, compact ? 8 : 10, compact ? 22 : 36);
  }

  const env = silhouette ? null : createPhoenixEnv(renderer);
  if (env) {
    scene.environment = env.texture;
    gl.track(env);
  }

  const camera = new PerspectiveCamera(portrait ? 38 : compact ? 32 : 36, 1, 0.12, 90);
  camera.position.set(compact ? -2.1 : portrait ? -0.35 : -2.8, compact ? 0.9 : portrait ? 0.2 : 0.35, compact ? 4.4 : portrait ? 4.2 : 5.4);

  const key = new DirectionalLight(0xc58a4b, silhouette ? 0 : compact ? 1.35 : 1.55);
  key.position.set(-4.6, 7.8, 5.4);
  const rim = new PointLight(0xe6cfa5, silhouette ? 0 : compact ? 1.7 : 2.1, 16, 1.15);
  const bounce = new PointLight(0xc58a4b, silhouette ? 0 : 0.38, 14, 1.8);
  bounce.position.set(0.2, -2.4, 1.6);
  if (!silhouette) {
    const hemi = new HemisphereLight(0x8299a0, 0x2a2520, 0.4);
    const ambient = new AmbientLight(0x2a2520, 0.18);
    const fill = new DirectionalLight(0x8299a0, 0.24);
    fill.position.set(6.8, 1.2, -2.4);
    scene.add(hemi, ambient, key, fill, rim, bounce);
  }

  const hall = silhouette ? new Group() : createHall(compact);
  scene.add(hall);
  const foreground = hall.userData.foreground as Group | undefined;
  const midground = hall.userData.midground as Group | undefined;
  const background = hall.userData.background as Group | undefined;

  const phoenix = createPhoenixRig(compact, { silhouette, portrait });
  scene.add(phoenix.root);
  rim.position.copy(phoenix.root.position);

  const phoenixPos = new Vector3();
  const camOff = new Vector3();
  const camLook = new Vector3();
  const lookOff = new Vector3();
  const featherWorld = new Vector3();
  const featherOrigin = new Vector3();
  let featherReleased = false;

  let raf = 0;
  let elapsed = compact ? 1.2 : 0.25;
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
    if (!allowPointer || silhouette) return;
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
      camera.fov = compact ? 32 : aspect < 0.86 ? 38 : immersive ? 36 : 35;
      camera.updateProjectionMatrix();
    }

    dampX += (pointerX - dampX) * 0.045;
    dampY += (pointerY - dampY) * 0.045;
    const rawScroll = compact ? 0.08 : readScrollProgress(node);
    const instVel = (rawScroll - scrollPrev) / Math.max(delta, 0.001);
    scrollPrev = rawScroll;
    scrollVel += (instVel - scrollVel) * 0.16;
    scrollVel *= Math.exp(-3.1 * delta);
    if (!compact) scroll += (rawScroll - scroll) * 0.16;
    else scroll = 0.08;

    const phase = compact ? 0.22 : scroll;
    const cycle = wingCycle(phase);
    const breathe = Math.sin(elapsed * 0.42) * 0.012;

    if (compact) {
      phoenix.root.position.set(0.06, 0.16, 0.04);
      phoenix.root.rotation.set(0.2, Math.PI + 0.5, 0.04);
      phoenix.leftWing.rotation.z = restZ(phoenix.leftWing) - cycle.dihedral;
      phoenix.rightWing.rotation.z = restZ(phoenix.rightWing) + cycle.dihedral;
      camera.position.set(-2.05 + dampX * 0.1, 1.02 + dampY * 0.06, 4.05);
      AIM.set(0.26, 0.14, -0.38);
      camera.lookAt(AIM);
      rim.position.set(0.15, 0.55, 0.2);
    } else if (portrait) {
      phoenix.root.position.set(0.04, 0.08 + Math.sin(elapsed * 0.4) * 0.03, 0);
      phoenix.root.rotation.set(0.92 + scroll * 0.08, Math.PI + 0.4, 0.05);
      phoenix.leftWing.rotation.z = restZ(phoenix.leftWing) - cycle.dihedral;
      phoenix.rightWing.rotation.z = restZ(phoenix.rightWing) + cycle.dihedral;
      phoenix.leftWing.rotation.y = restY(phoenix.leftWing) - cycle.sweep;
      phoenix.rightWing.rotation.y = restY(phoenix.rightWing) + cycle.sweep;
      phoenix.leftWing.rotation.x = restX(phoenix.leftWing) + cycle.fold;
      phoenix.rightWing.rotation.x = restX(phoenix.rightWing) + cycle.fold;
      phoenix.tail.rotation.x = restX(phoenix.tail) + Math.sin(elapsed * 0.4 - 0.5) * 0.04;
      camera.position.set(-0.55 + dampX * 0.08, 0.15, 3.85);
      AIM.set(0.12, 0.22, -0.18);
      keepInFrame(camera, phoenix.root, camera.position, AIM, true);
      camera.lookAt(AIM);
      rim.position.copy(phoenix.root.position);
    } else {
      sampleShot(FLIGHT, scroll, phoenixPos);
      const bob = Math.sin(elapsed * 0.48) * 0.045;
      phoenix.root.position.set(phoenixPos.x, phoenixPos.y + bob, phoenixPos.z);
      const bank = Math.max(-0.14, Math.min(0.14, scrollVel * 0.035 + dampX * 0.05));
      phoenix.root.rotation.set(-0.16 + breathe, Math.PI + 0.52 + scroll * 0.14, bank);
      phoenix.body.rotation.x = restX(phoenix.body) - 0.04;
      phoenix.tail.rotation.x = restX(phoenix.tail) + Math.sin(elapsed * 0.42 - 0.55) * 0.045;
      phoenix.leftWing.rotation.z = restZ(phoenix.leftWing) - cycle.dihedral;
      phoenix.rightWing.rotation.z = restZ(phoenix.rightWing) + cycle.dihedral;
      phoenix.leftWing.rotation.y = restY(phoenix.leftWing) - cycle.sweep;
      phoenix.rightWing.rotation.y = restY(phoenix.rightWing) + cycle.sweep;
      phoenix.leftWing.rotation.x = restX(phoenix.leftWing) + cycle.fold * 0.6;
      phoenix.rightWing.rotation.x = restX(phoenix.rightWing) + cycle.fold * 0.6;

      for (let i = 0; i < phoenix.feathers.length; i += 1) {
        const feather = phoenix.feathers[i];
        if (!feather || feather === phoenix.detached) continue;
        const rest = typeof feather.userData.restX === 'number' ? feather.userData.restX : feather.rotation.x;
        feather.rotation.x = rest + Math.sin(elapsed * 0.42 - i * 0.07) * 0.02;
      }

      if (!silhouette) {
        const featherU = smooth((scroll - 0.45) / 0.28);
        if (featherU > 0 && !featherReleased) {
          phoenix.detached.updateWorldMatrix(true, false);
          phoenix.detached.getWorldPosition(featherOrigin);
          scene.attach(phoenix.detached);
          featherReleased = true;
        }
        if (featherReleased) {
          const u = Math.min(1, Math.max(0, featherU));
          const sCurve = Math.sin(u * Math.PI * 2) * 0.62;
          const fall = u * u * 1.85;
          const slow = 1 - u ** 1.6;
          featherWorld.set(
            featherOrigin.x + sCurve,
            featherOrigin.y - fall + Math.sin(u * Math.PI) * 0.32,
            featherOrigin.z + (1 - Math.cos(u * Math.PI)) * 0.42,
          );
          phoenix.detached.position.lerp(featherWorld, 0.1);
          const restY = typeof phoenix.detached.userData.restY === 'number' ? phoenix.detached.userData.restY : 0.55;
          phoenix.detached.rotation.y = restY + u * Math.PI * 2;
          phoenix.detached.rotation.z = Math.sin(u * Math.PI * 2.1) * 0.28 * slow;
          phoenix.detached.rotation.x = 0.18 + u * 0.5 + Math.sin(elapsed * 0.4) * 0.025;
        }
      }

      sampleShot(CAMERA, scroll, camOff);
      sampleShot(LOOK, scroll, lookOff);
      if (aspect < 0.86) {
        camOff.x *= 0.42;
        camOff.z *= 1.18;
        if (camOff.y < -0.55) camOff.y = -0.55;
        camOff.y += 0.2;
      }
      camLook.copy(phoenix.root.position).add(lookOff);
      TMP.copy(phoenix.root.position).add(camOff);

      if (!silhouette && scroll > 0.45 && scroll < 0.78 && featherReleased) {
        const mix = smooth((scroll - 0.45) / 0.1);
        const hold = scroll < 0.66 ? mix : mix * (1 - smooth((scroll - 0.66) / 0.12));
        camLook.lerp(phoenix.detached.position, hold * 0.62);
        TMP.lerp(
          TMP_B.set(
            phoenix.detached.position.x + 1.05,
            phoenix.detached.position.y + 0.38,
            phoenix.detached.position.z + 1.85,
          ),
          hold * 0.55,
        );
      }

      TMP.x += dampX * 0.18;
      TMP.y += dampY * 0.06 + Math.sin(elapsed * 0.1) * 0.016;
      keepInFrame(camera, phoenix.root, TMP, camLook, false);
      camera.position.lerp(TMP, 1 - Math.exp(-3.2 * delta));
      AIM.lerp(camLook, 0.16);
      PREV_Q.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(AIM);
      NEXT_Q.copy(camera.quaternion);
      camera.quaternion.copy(PREV_Q).slerp(NEXT_Q, 0.16);
      rim.position.copy(phoenix.root.position);
      rim.position.y += 0.42;
      rim.position.z -= 0.5;
      key.intensity = silhouette ? 0 : 1.48 + Math.min(0.08, Math.abs(scrollVel) * 0.02);

      if (foreground && background && midground) {
        foreground.position.x = -camOff.x * 0.16;
        foreground.position.y = -camOff.y * 0.06;
        background.position.x = -camOff.x * 0.04;
        midground.position.x = -camOff.x * 0.07;
      }
    }

    renderer.render(scene, camera);
  }

  raf = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(raf);
    node.removeEventListener('pointermove', onPointer);
    if (silhouette) {
      delete document.documentElement.dataset.phoenixSilhouette;
      node.classList.remove(styles.silhouette);
    }
    phoenix.geometries.forEach((geo) => geo.dispose());
    phoenix.materials.forEach((mat) => mat.dispose());
    hall.traverse((obj) => {
      const mesh = obj as Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((item) => item.dispose());
      else mat.dispose();
    });
    gl.dispose();
  };
}

function createHall(compact: boolean): Group {
  const hall = new Group();
  const background = new Group();
  const midground = new Group();
  const foreground = new Group();
  hall.add(background, midground, foreground);
  hall.userData.background = background;
  hall.userData.midground = midground;
  hall.userData.foreground = foreground;

  const groundGeo = new PlaneGeometry(48, 48);
  const groundMat = new MeshStandardMaterial({
    color: 0x151311,
    roughness: 0.22,
    metalness: 0.58,
    envMapIntensity: 0.85,
  });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.6;
  background.add(ground);

  const stoneMat = new MeshStandardMaterial({
    color: 0x2a2520,
    roughness: 0.82,
    metalness: 0.05,
    envMapIntensity: 0.28,
  });
  const glassArch = createGlassMaterial({
    tint: 0x3a3530,
    rim: 0xe6cfa5,
    absorb: 0x0c0a0c,
    opacity: compact ? 0.1 : 0.13,
    iri: 0.03,
    gain: 0.78,
  });

  const wallGeo = new BoxGeometry(2.2, 18, 0.8);
  const wallPlaces = [
    [-11.5, 4.2, -14, 0.18],
    [12.4, 3.6, -16, -0.16],
    [-7.2, 5.1, -22, 0.08],
    [8.4, 4.8, -24, -0.1],
    [-1.2, 6.4, -30, 0.02],
  ] as const;
  for (const [x, y, z, rot] of wallPlaces) {
    const wall = new Mesh(wallGeo, stoneMat);
    wall.position.set(x, y, z);
    wall.rotation.y = rot;
    background.add(wall);
  }

  const naveGeo = new BoxGeometry(28, 0.7, 2.4);
  const lintel = new Mesh(naveGeo, stoneMat);
  lintel.position.set(0.4, 9.4, -20);
  background.add(lintel);

  const finGeo = new BoxGeometry(0.18, 16, 4.2);
  const finPlaces = [
    [-7.4, 3.2, -8, 0.42],
    [8.6, 2.4, -10, -0.36],
    [2.1, 4.2, -14, 0.08],
  ] as const;
  for (const [x, y, z, rot] of finPlaces) {
    const fin = new Mesh(finGeo, glassArch);
    fin.position.set(x, y, z);
    fin.rotation.y = rot;
    midground.add(fin);
  }

  const slitGeo = new BoxGeometry(0.14, 13, 0.14);
  const slitMat = new MeshBasicMaterial({
    color: 0xc58a4b,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const slits = [
    [-6.8, 3.2, -13],
    [7.6, 2.6, -16],
    [0.2, 4.4, -20],
    [-3.2, 5.2, -26],
  ] as const;
  for (const [x, y, z] of slits) {
    const slit = new Mesh(slitGeo, slitMat);
    slit.position.set(x, y, z);
    background.add(slit);
  }

  const hazeGeo = new PlaneGeometry(6.5, 16);
  const hazeMat = new MeshBasicMaterial({
    color: 0x8299a0,
    transparent: true,
    opacity: compact ? 0.03 : 0.045,
    depthWrite: false,
    fog: false,
  });
  const hazeA = new Mesh(hazeGeo, hazeMat);
  hazeA.position.set(-3.2, 2.8, -6.5);
  hazeA.rotation.y = 0.2;
  const hazeB = hazeA.clone();
  hazeB.position.set(4.4, 3.4, -11);
  hazeB.rotation.y = -0.16;
  midground.add(hazeA, hazeB);

  const bladeGeo = new BoxGeometry(0.7, 9.5, 3.2);
  const bladeA = new Mesh(bladeGeo, stoneMat);
  bladeA.position.set(-3.8, 0.4, 3.6);
  bladeA.rotation.y = 0.62;
  const bladeB = new Mesh(bladeGeo, glassArch);
  bladeB.position.set(4.8, -0.2, 2.8);
  bladeB.rotation.y = -0.48;
  foreground.add(bladeA, bladeB);

  return hall;
}

function createPhoenixEnv(renderer: WebGLRenderer): { texture: Texture; dispose: () => void } {
  const envScene = new Scene();
  envScene.background = new Color(0x151311);
  const card = new PlaneGeometry(16, 16);
  const slit = new PlaneGeometry(1.4, 20);
  const sun = new Mesh(card, new MeshBasicMaterial({ color: 0xc58a4b }));
  sun.position.set(-2.6, 9.4, 4.8);
  sun.rotation.x = Math.PI / 2;
  const warm = new Mesh(card, new MeshBasicMaterial({ color: 0xe6cfa5 }));
  warm.position.set(-7.6, 3.0, 2.0);
  warm.rotation.y = Math.PI / 2;
  const fill = new Mesh(card, new MeshBasicMaterial({ color: 0x8299a0 }));
  fill.position.set(7.8, 1.2, 2.2);
  fill.rotation.y = -Math.PI / 2;
  const ground = new Mesh(card, new MeshBasicMaterial({ color: 0x2a2520 }));
  ground.position.set(0, -5.8, 0);
  ground.rotation.x = -Math.PI / 2;
  const beam = new Mesh(slit, new MeshBasicMaterial({ color: 0xe6cfa5 }));
  beam.position.set(0.5, 3.0, 7.6);
  const cool = new Mesh(slit, new MeshBasicMaterial({ color: 0x8299a0 }));
  cool.position.set(-4.2, 2.4, 6.8);
  envScene.add(sun, warm, fill, ground, beam, cool);
  const pmrem = new PMREMGenerator(renderer);
  const target: WebGLRenderTarget = pmrem.fromScene(envScene, 0.04);
  card.dispose();
  slit.dispose();
  sun.material.dispose();
  warm.material.dispose();
  fill.material.dispose();
  ground.material.dispose();
  beam.material.dispose();
  cool.material.dispose();
  pmrem.dispose();
  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
