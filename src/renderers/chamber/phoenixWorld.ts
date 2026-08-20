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
  InstancedMesh,
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
  { t: 0, x: 0.35, y: 1.35, z: -0.8 },
  { t: 0.16, x: -0.7, y: 2.15, z: 0.2 },
  { t: 0.32, x: 1.15, y: 1.45, z: 1.4 },
  { t: 0.5, x: -0.55, y: 1.55, z: 1.8 },
  { t: 0.68, x: 0.85, y: 1.95, z: 0.6 },
  { t: 1, x: 0.2, y: 1.5, z: -0.4 },
];

const CAMERA: Shot[] = [
  { t: 0, x: -3.6, y: -0.25, z: 6.4 },
  { t: 0.16, x: -2.2, y: -2.05, z: 5.6 },
  { t: 0.32, x: -5.1, y: 0.45, z: 4.6 },
  { t: 0.5, x: 1.4, y: 0.55, z: 3.2 },
  { t: 0.68, x: 3.6, y: 0.7, z: 3.4 },
  { t: 0.88, x: -3.2, y: 1.55, z: 8.6 },
  { t: 1, x: -2.6, y: 1.15, z: 8.0 },
];

const LOOK: Shot[] = [
  { t: 0, x: 0.45, y: 0.22, z: -0.55 },
  { t: 0.16, x: 0.25, y: 0.4, z: -0.3 },
  { t: 0.32, x: 1.15, y: 0.12, z: 0.15 },
  { t: 0.5, x: 0.15, y: 0.1, z: 0.05 },
  { t: 0.68, x: 0.2, y: 0.08, z: 0.1 },
  { t: 0.88, x: 0.3, y: 0.28, z: -0.2 },
  { t: 1, x: 0.22, y: 0.2, z: -0.18 },
];

const TMP = new Vector3();
const TMP_B = new Vector3();
const AIM = new Vector3();
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

function frameOffset(offset: Vector3, aspect: number): void {
  const portrait = aspect < 0.86;
  if (!portrait) return;
  offset.x *= 0.48;
  offset.z *= 1.22;
  if (offset.y < -0.8) offset.y = -0.8;
  offset.y += 0.25;
}

export function startPhoenixWorld(
  node: HTMLDivElement,
  compact: boolean,
  immersive: boolean,
  environmentUrl: string | null,
): (() => void) | undefined {
  void environmentUrl;
  const runtime = createRendererRuntime({
    node,
    fallbackClass: styles.fallback,
    antialias: true,
    alpha: false,
    desktopDpr: compact ? 1 : immersive ? 1.5 : 1.35,
    mobileDpr: compact ? 1 : 1.12,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  renderer.toneMappingExposure = compact ? 1.0 : 0.94;

  const scene = new Scene();
  const bg = new Color(0x151311);
  scene.background = bg;
  scene.fog = new Fog(0x151311, compact ? 7 : 9, compact ? 20 : 32);

  const env = createPhoenixEnv(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(compact ? 30 : 32, 1, 0.12, 90);
  camera.position.set(compact ? -2.1 : -3.6, compact ? 0.9 : 0.4, compact ? 4.4 : 6.6);

  const hemi = new HemisphereLight(0x8299a0, 0x2a2520, 0.42);
  const ambient = new AmbientLight(0x151311, 0.22);
  const key = new DirectionalLight(0xc58a4b, compact ? 1.45 : 1.65);
  key.position.set(-4.6, 7.8, 5.4);
  const fill = new DirectionalLight(0x8299a0, 0.28);
  fill.position.set(6.8, 1.2, -2.4);
  const rim = new PointLight(0xe6cfa5, compact ? 1.7 : 2.2, 16, 1.15);
  const bounce = new PointLight(0xc58a4b, 0.42, 14, 1.8);
  bounce.position.set(0.2, -2.6, 1.6);
  scene.add(hemi, ambient, key, fill, rim, bounce);

  const groundGeo = new CircleGeometry(28, 48);
  const groundMat = new MeshStandardMaterial({
    color: 0x151311,
    roughness: 0.28,
    metalness: 0.62,
    envMapIntensity: 0.9,
  });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.8;
  scene.add(ground);

  const stoneMat = new MeshStandardMaterial({
    color: 0x2a2520,
    roughness: 0.78,
    metalness: 0.06,
    envMapIntensity: 0.35,
  });
  const glassArch = createGlassMaterial({
    tint: 0x3a3530,
    rim: 0xe6cfa5,
    absorb: 0x0c0a0c,
    opacity: compact ? 0.1 : 0.12,
    iri: 0.04,
    gain: 0.82,
  });

  const background = new Group();
  const midground = new Group();
  const foreground = new Group();
  const stoneGeo = new BoxGeometry(2.6, 12, 0.7);
  const stonePlaces = [
    [-9.5, 1.4, -16, 0.28],
    [11.2, 0.6, -18, -0.22],
    [-4.8, 2.2, -24, 0.12],
    [6.4, 1.8, -26, -0.18],
  ] as const;
  for (const [x, y, z, rot] of stonePlaces) {
    const slab = new Mesh(stoneGeo, stoneMat);
    slab.position.set(x, y, z);
    slab.rotation.y = rot;
    background.add(slab);
  }

  const finGeo = new BoxGeometry(0.16, 14, 3.2);
  const finPlaces = [
    [-8.2, 2.2, -9, 0.38],
    [9.4, 1.4, -11, -0.32],
    [1.6, 3.4, -15, 0.1],
  ] as const;
  for (const [x, y, z, rot] of finPlaces) {
    const fin = new Mesh(finGeo, glassArch);
    fin.position.set(x, y, z);
    fin.rotation.y = rot;
    midground.add(fin);
  }

  const slitGeo = new BoxGeometry(0.12, 11, 0.12);
  const slitMat = new MeshBasicMaterial({
    color: 0xc58a4b,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const slits = [
    [-6.4, 2.4, -14],
    [7.2, 1.8, -17],
    [0.4, 3.6, -21],
  ] as const;
  for (const [x, y, z] of slits) {
    const slit = new Mesh(slitGeo, slitMat);
    slit.position.set(x, y, z);
    background.add(slit);
  }

  const bladeGeo = new BoxGeometry(0.22, 7.5, 2.4);
  const bladeA = new Mesh(bladeGeo, glassArch);
  bladeA.position.set(-4.8, 1.1, 3.4);
  bladeA.rotation.y = 0.55;
  const bladeB = new Mesh(bladeGeo, glassArch);
  bladeB.position.set(5.6, 0.4, 2.6);
  bladeB.rotation.y = -0.42;
  foreground.add(bladeA, bladeB);

  const hazeGeo = new PlaneGeometry(4.5, 14);
  const hazeMat = new MeshBasicMaterial({
    color: 0xc58a4b,
    transparent: true,
    opacity: compact ? 0.025 : 0.04,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
  const haze = new Mesh(hazeGeo, hazeMat);
  haze.position.set(-2.2, 2.4, -7);
  haze.rotation.z = 0.14;
  midground.add(haze);

  scene.add(background, midground, foreground);

  const phoenix = createPhoenixRig(compact);
  scene.add(phoenix.root);
  rim.position.copy(phoenix.root.position);

  const shardCount = compact ? 12 : 28;
  const shardGeo = new PlaneGeometry(0.06, 0.16);
  const shardMat = new MeshStandardMaterial({
    color: 0xe6cfa5,
    roughness: 0.2,
    metalness: 0.22,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const shards = new InstancedMesh(shardGeo, shardMat, shardCount);
  for (let i = 0; i < shardCount; i += 1) {
    const t = i / shardCount;
    DUMMY.position.set(
      Math.sin(i * 1.73) * (3.2 + t * 5),
      0.3 + Math.cos(i * 0.91) * 1.8 + t,
      -12 + t * 16 + Math.sin(i * 0.62) * 1.1,
    );
    DUMMY.rotation.set(0.3, i * 0.6, 0.12);
    DUMMY.scale.setScalar(0.45 + (i % 4) * 0.12);
    DUMMY.updateMatrix();
    shards.setMatrixAt(i, DUMMY.matrix);
  }
  midground.add(shards);

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
      camera.fov = compact ? 30 : aspect < 0.86 ? 36 : immersive ? 32 : 31;
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

    const beat = Math.sin(elapsed * 0.62);
    const open = smooth(Math.min(1, (compact ? 0.75 : scroll) / 0.18));
    const lift = 0.42 + open * 0.1;
    const amp = 0.14 + open * 0.1;

    if (compact) {
      phoenix.root.position.set(0.08, 0.18, 0.04);
      phoenix.root.rotation.set(0.18, Math.PI + 0.52 + elapsed * 0.02, 0.04);
      phoenix.leftWing.rotation.z = -lift - beat * amp;
      phoenix.rightWing.rotation.z = lift + beat * amp;
      camera.position.set(-2.05 + dampX * 0.12, 1.05 + dampY * 0.08, 4.15);
      AIM.set(0.28, 0.12, -0.42);
      camera.lookAt(AIM);
      rim.position.set(0.15, 0.55, 0.2);
    } else {
      sampleShot(FLIGHT, scroll, phoenixPos);
      const bob = Math.sin(elapsed * 0.58) * 0.06;
      phoenix.root.position.set(phoenixPos.x, phoenixPos.y + bob, phoenixPos.z);
      const bank = Math.max(-0.18, Math.min(0.18, scrollVel * 0.04 + dampX * 0.06));
      const present = Math.PI + 0.48 + scroll * 0.18;
      phoenix.root.rotation.set(0.16 + Math.sin(elapsed * 0.5) * 0.03, present, bank);

      phoenix.leftWing.rotation.z = -lift - beat * amp;
      phoenix.rightWing.rotation.z = lift + beat * amp;
      phoenix.leftWing.rotation.y = -0.1 + beat * 0.03;
      phoenix.rightWing.rotation.y = 0.1 - beat * 0.03;
      phoenix.tail.rotation.x = 0.06 + Math.sin(elapsed * 0.62 - 0.45) * 0.05;
      for (let i = 0; i < phoenix.feathers.length; i += 1) {
        const feather = phoenix.feathers[i];
        if (!feather || feather === phoenix.detached) continue;
        const rest = typeof feather.userData.restX === 'number' ? feather.userData.restX : feather.rotation.x;
        feather.rotation.x = rest + Math.sin(elapsed * 0.62 - i * 0.09) * 0.035;
      }

      const featherU = smooth((scroll - 0.45) / 0.28);
      if (featherU > 0 && !featherReleased) {
        phoenix.detached.updateWorldMatrix(true, false);
        phoenix.detached.getWorldPosition(featherOrigin);
        scene.attach(phoenix.detached);
        featherReleased = true;
      }
      if (featherReleased) {
        const u = Math.min(1, Math.max(0, featherU));
        const sCurve = Math.sin(u * Math.PI * 2) * 0.7;
        const fall = u * u * 2.15;
        const slow = 1 - Math.pow(u, 1.6);
        featherWorld.set(
          featherOrigin.x + sCurve,
          featherOrigin.y - fall + Math.sin(u * Math.PI) * 0.38,
          featherOrigin.z + (1 - Math.cos(u * Math.PI)) * 0.48,
        );
        phoenix.detached.position.lerp(featherWorld, 0.1);
        phoenix.detached.rotation.y = (typeof phoenix.detached.userData.restY === 'number'
          ? phoenix.detached.userData.restY
          : 0.55) + u * Math.PI * 2;
        phoenix.detached.rotation.z = Math.sin(u * Math.PI * 2.1) * 0.32 * slow;
        phoenix.detached.rotation.x =
          0.2 + u * 0.55 + Math.sin(elapsed * 0.45) * 0.03;
      }

      sampleShot(CAMERA, scroll, camOff);
      sampleShot(LOOK, scroll, lookOff);
      frameOffset(camOff, aspect);
      camLook.copy(phoenix.root.position).add(lookOff);
      TMP.copy(phoenix.root.position).add(camOff);

      if (scroll > 0.45 && scroll < 0.78 && featherReleased) {
        const mix = smooth((scroll - 0.45) / 0.1);
        const hold = scroll < 0.66 ? mix : mix * (1 - smooth((scroll - 0.66) / 0.12));
        camLook.lerp(phoenix.detached.position, hold * 0.78);
        TMP.lerp(
          TMP_B.set(
            phoenix.detached.position.x + (aspect < 0.86 ? 0.55 : 1.15),
            phoenix.detached.position.y + 0.42,
            phoenix.detached.position.z + (aspect < 0.86 ? 1.55 : 2.05),
          ),
          hold * 0.7,
        );
      }

      TMP.x += dampX * 0.22;
      TMP.y += dampY * 0.08 + Math.sin(elapsed * 0.1) * 0.02;
      camera.position.lerp(TMP, 1 - Math.exp(-3.4 * delta));
      AIM.lerp(camLook, 0.16);
      PREV_Q.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(AIM);
      NEXT_Q.copy(camera.quaternion);
      camera.quaternion.copy(PREV_Q).slerp(NEXT_Q, 0.16);
      rim.position.copy(phoenix.root.position);
      rim.position.y += 0.45;
      rim.position.z -= 0.55;
      key.intensity = 1.55 + Math.min(0.1, Math.abs(scrollVel) * 0.02);

      foreground.visible = scroll < 0.44 || scroll > 0.78;
      background.position.x = -camOff.x * 0.035;
      midground.position.x = -camOff.x * 0.06;
    }

    for (let i = 0; i < shardCount; i += 1) {
      const t = i / shardCount;
      DUMMY.position.set(
        Math.sin(i * 1.73 + elapsed * 0.08) * (3.2 + t * 5),
        0.3 + Math.cos(i * 0.91 + elapsed * 0.06) * 1.8 + t,
        -12 + t * 16 + Math.sin(i * 0.62 + elapsed * 0.05) * 1.1 - scroll * 3.2,
      );
      DUMMY.rotation.set(0.3 + elapsed * 0.1, i * 0.6, 0.12);
      DUMMY.scale.setScalar(0.4 + (i % 4) * 0.12);
      DUMMY.updateMatrix();
      shards.setMatrixAt(i, DUMMY.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
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
    stoneGeo.dispose();
    stoneMat.dispose();
    finGeo.dispose();
    glassArch.dispose();
    slitGeo.dispose();
    slitMat.dispose();
    bladeGeo.dispose();
    hazeGeo.dispose();
    hazeMat.dispose();
    shardGeo.dispose();
    shardMat.dispose();
    shards.dispose();
    gl.dispose();
  };
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
