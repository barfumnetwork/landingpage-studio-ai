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
  { t: 0, x: 0.2, y: 1.55, z: -1.8 },
  { t: 0.16, x: -1.15, y: 2.85, z: -0.4 },
  { t: 0.32, x: 1.65, y: 1.7, z: 1.8 },
  { t: 0.5, x: -0.85, y: 1.25, z: 3.4 },
  { t: 0.68, x: 1.2, y: 2.35, z: 1.1 },
  { t: 1, x: 0.15, y: 1.85, z: -1.1 },
];

const CAMERA: Shot[] = [
  { t: 0, x: -2.8, y: 4.2, z: 9.4 },
  { t: 0.16, x: -1.4, y: -3.2, z: 6.6 },
  { t: 0.32, x: -6.4, y: 2.8, z: 4.6 },
  { t: 0.5, x: 1.8, y: 1.1, z: 3.2 },
  { t: 0.68, x: 2.6, y: 1.4, z: 2.4 },
  { t: 0.88, x: -3.2, y: 3.8, z: 11.2 },
  { t: 1, x: -2.4, y: 3.1, z: 10.4 },
];

const LOOK: Shot[] = [
  { t: 0, x: 0.55, y: 0.35, z: -0.7 },
  { t: 0.16, x: 0.2, y: 0.55, z: -0.35 },
  { t: 0.32, x: 1.4, y: 0.15, z: 0.25 },
  { t: 0.5, x: 0, y: 0.1, z: 0.1 },
  { t: 0.68, x: 0.1, y: 0.05, z: 0.05 },
  { t: 0.88, x: 0.25, y: 0.4, z: -0.2 },
  { t: 1, x: 0.2, y: 0.3, z: -0.25 },
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
    desktopDpr: compact ? 1 : immersive ? 1.55 : 1.4,
    mobileDpr: compact ? 1 : 1.12,
    compact,
    toneMapping: 'aces',
  });
  if (!runtime) return undefined;
  const gl = runtime;
  const { renderer } = gl;
  renderer.toneMappingExposure = compact ? 1.02 : 0.96;

  const scene = new Scene();
  scene.background = new Color(0x16141c);
  scene.fog = new Fog(0x16141c, compact ? 8 : 11, compact ? 22 : 36);

  const env = createPhoenixEnv(renderer);
  scene.environment = env.texture;
  gl.track(env);

  const camera = new PerspectiveCamera(compact ? 28 : immersive ? 32 : 30, 1, 0.15, 90);
  camera.position.set(compact ? -2.4 : -4.8, compact ? 1.4 : 2.6, compact ? 4.6 : 14);

  const hemi = new HemisphereLight(0x9bb4c8, 0x3a2a22, compact ? 0.62 : 0.78);
  const ambient = new AmbientLight(0x2c2834, 0.32);
  const key = new DirectionalLight(0xffd294, compact ? 1.55 : 1.75);
  key.position.set(-5.2, 9.4, 6.2);
  const fill = new DirectionalLight(0x88b0cc, 0.55);
  fill.position.set(7.2, 1.4, -2.8);
  const rim = new PointLight(0xffe6c0, compact ? 1.6 : 2.35, 18, 1.2);
  const kick = new PointLight(0x8eb8d8, 0.7, 20, 1.6);
  kick.position.set(4.2, 2.4, 5.5);
  const bounce = new PointLight(0xc48a4a, 0.35, 16, 2);
  bounce.position.set(0, -2.8, 2);
  scene.add(hemi, ambient, key, fill, rim, kick, bounce);

  const groundGeo = new CircleGeometry(32, 48);
  const groundMat = new MeshStandardMaterial({
    color: 0x1a1714,
    roughness: 0.32,
    metalness: 0.58,
    envMapIntensity: 0.85,
  });
  const ground = new Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -4.4;
  scene.add(ground);

  const architecture = new Group();
  const finGeo = new BoxGeometry(0.18, 16, 3.6);
  const finMat = createGlassMaterial({
    tint: 0x5c6774,
    rim: 0xe2c8a4,
    absorb: 0x101018,
    opacity: compact ? 0.1 : 0.14,
    iri: 0.05,
    gain: 0.82,
  });
  const finPlaces = [
    [-13.5, 2.4, -18, 0.42],
    [15.2, 1.1, -22, -0.38],
    [-8.4, 4.2, -28, 0.18],
    [11.5, 2.8, -17, -0.48],
    [1.2, 6.4, -34, 0.12],
    [-18, 3.2, -12, 0.62],
  ] as const;
  for (const [x, y, z, rot] of finPlaces) {
    const fin = new Mesh(finGeo, finMat);
    fin.position.set(x, y, z);
    fin.rotation.y = rot;
    architecture.add(fin);
  }
  scene.add(architecture);

  const hazeGeo = new PlaneGeometry(6, 18);
  const hazeMat = new MeshBasicMaterial({
    color: 0xffc878,
    transparent: true,
    opacity: compact ? 0.03 : 0.045,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: false,
  });
  const hazeA = new Mesh(hazeGeo, hazeMat);
  hazeA.position.set(-3.4, 3.2, -8);
  hazeA.rotation.z = 0.18;
  const hazeB = new Mesh(hazeGeo, hazeMat);
  hazeB.position.set(5.2, 2.4, -12);
  hazeB.rotation.z = -0.22;
  scene.add(hazeA, hazeB);

  const phoenix = createPhoenixRig(compact);
  scene.add(phoenix.root);
  rim.position.copy(phoenix.root.position);

  const shardCount = compact ? 18 : 48;
  const shardGeo = new PlaneGeometry(0.08, 0.22);
  const shardMat = new MeshStandardMaterial({
    color: 0xf0e2c8,
    roughness: 0.16,
    metalness: 0.28,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    envMapIntensity: 1.4,
  });
  const shards = new InstancedMesh(shardGeo, shardMat, shardCount);
  for (let i = 0; i < shardCount; i += 1) {
    const t = i / shardCount;
    DUMMY.position.set(
      Math.sin(i * 1.73) * (4 + t * 7),
      0.2 + Math.cos(i * 0.91) * 2.4 + t * 1.6,
      -16 + t * 22 + Math.sin(i * 0.62) * 1.2,
    );
    DUMMY.rotation.set(0.4, i * 0.7, 0.2);
    DUMMY.scale.setScalar(0.55 + (i % 4) * 0.18);
    DUMMY.updateMatrix();
    shards.setMatrixAt(i, DUMMY.matrix);
  }
  scene.add(shards);

  const phoenixPos = new Vector3();
  const phoenixAhead = new Vector3();
  const camOff = new Vector3();
  const camLook = new Vector3();
  const lookOff = new Vector3();
  const featherWorld = new Vector3();
  const featherOrigin = new Vector3();
  let featherReleased = false;

  let raf = 0;
  let elapsed = compact ? 1.1 : 0.2;
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
    }

    dampX += (pointerX - dampX) * 0.045;
    dampY += (pointerY - dampY) * 0.045;
    const rawScroll = compact ? 0.08 : readScrollProgress(node);
    const instVel = (rawScroll - scrollPrev) / Math.max(delta, 0.001);
    scrollPrev = rawScroll;
    scrollVel += (instVel - scrollVel) * 0.14;
    scrollVel *= Math.exp(-2.8 * delta);
    if (!compact) scroll += (rawScroll - scroll) * 0.11;
    else scroll = 0.08;

    const beat = Math.sin(elapsed * 0.92);
    const open = smooth(Math.min(1, (compact ? 0.7 : scroll) / 0.2));

    if (compact) {
      phoenix.root.position.set(0.12, 0.28, 0.05);
      phoenix.root.rotation.set(0.12, 0.72 + elapsed * 0.035, 0.04);
      phoenix.leftWing.rotation.z = -0.22 - beat * 0.28;
      phoenix.rightWing.rotation.z = 0.22 + beat * 0.28;
      camera.position.set(-2.05 + dampX * 0.16, 1.85 + dampY * 0.1, 4.35);
      AIM.set(0.2, 0.22, -0.2);
      camera.lookAt(AIM);
      rim.position.set(0.2, 0.7, 0.4);
    } else {
      sampleShot(FLIGHT, scroll, phoenixPos);
      sampleShot(FLIGHT, Math.min(1, scroll + 0.045), phoenixAhead);
      const bob = Math.sin(elapsed * 0.72) * 0.08;
      phoenix.root.position.set(phoenixPos.x, phoenixPos.y + bob, phoenixPos.z);
      phoenix.root.lookAt(phoenixAhead.x, phoenixAhead.y + bob, phoenixAhead.z);
      const bank = Math.max(-0.28, Math.min(0.28, scrollVel * 0.06 + dampX * 0.1));
      phoenix.root.rotation.z += (-bank - phoenix.root.rotation.z) * 0.07;

      const lift = 0.28 + open * 0.12;
      const amp = 0.18 + open * 0.14;
      phoenix.leftWing.rotation.z = -lift - beat * amp;
      phoenix.rightWing.rotation.z = lift + beat * amp;
      phoenix.leftWing.rotation.y = beat * 0.04;
      phoenix.rightWing.rotation.y = -beat * 0.04;
      phoenix.tail.rotation.x = 0.08 + Math.sin(elapsed * 0.8) * 0.05;
      for (let i = 0; i < phoenix.feathers.length; i += 1) {
        const feather = phoenix.feathers[i];
        if (!feather || feather === phoenix.detached) continue;
        feather.rotation.x += Math.sin(elapsed * 0.92 - i * 0.08) * 0.0016;
      }

      const featherU = smooth((scroll - 0.46) / 0.32);
      if (featherU > 0 && !featherReleased) {
        phoenix.detached.updateWorldMatrix(true, false);
        phoenix.detached.getWorldPosition(featherOrigin);
        scene.attach(phoenix.detached);
        phoenix.detached.scale.setScalar(2.15);
        featherReleased = true;
      }
      if (featherReleased) {
        const u = Math.min(1, Math.max(0, featherU));
        const sCurve = Math.sin(u * Math.PI * 2) * 0.82;
        const fall = u * u * 2.85;
        const drift = (1 - Math.cos(u * Math.PI)) * 0.55;
        featherWorld.set(
          featherOrigin.x + sCurve,
          featherOrigin.y - fall + Math.sin(u * Math.PI) * 0.42,
          featherOrigin.z + drift,
        );
        phoenix.detached.position.lerp(featherWorld, 0.12);
        phoenix.detached.rotation.y = Math.PI * 0.5 + u * Math.PI * 2.05;
        phoenix.detached.rotation.z = Math.sin(u * Math.PI * 2.4) * 0.38;
        phoenix.detached.rotation.x = 0.28 + u * 0.7 + Math.sin(elapsed * 0.6) * 0.04;
      }

      sampleShot(CAMERA, scroll, camOff);
      sampleShot(LOOK, scroll, lookOff);
      camLook.copy(phoenix.root.position).add(lookOff);
      TMP.copy(phoenix.root.position).add(camOff);

      if (scroll > 0.46 && scroll < 0.82 && featherReleased) {
        const mix = smooth((scroll - 0.46) / 0.12);
        const hold = scroll < 0.72 ? mix : mix * (1 - smooth((scroll - 0.72) / 0.1));
        camLook.lerp(phoenix.detached.position, hold * 0.96);
        TMP.lerp(
          TMP_B.set(
            phoenix.detached.position.x + 1.05,
            phoenix.detached.position.y + 0.38,
            phoenix.detached.position.z + 1.85,
          ),
          hold * 0.88,
        );
      }

      TMP.x += dampX * 0.32;
      TMP.y += dampY * 0.12 + Math.sin(elapsed * 0.11) * 0.03;
      camera.position.lerp(TMP, 1 - Math.exp(-2.8 * delta));
      AIM.lerp(camLook, 0.12);
      PREV_Q.copy(camera.quaternion);
      camera.up.set(0, 1, 0);
      camera.lookAt(AIM);
      NEXT_Q.copy(camera.quaternion);
      camera.quaternion.copy(PREV_Q).slerp(NEXT_Q, 0.12);
      rim.position.copy(phoenix.root.position);
      rim.position.y += 0.55;
      rim.position.z -= 0.4;
      key.intensity = 1.7 + Math.min(0.12, Math.abs(scrollVel) * 0.02);
    }

    for (let i = 0; i < shardCount; i += 1) {
      const t = i / shardCount;
      DUMMY.position.set(
        Math.sin(i * 1.73 + elapsed * 0.12) * (4 + t * 7),
        0.2 + Math.cos(i * 0.91 + elapsed * 0.09) * 2.4 + t * 1.6,
        -16 + t * 22 + Math.sin(i * 0.62 + elapsed * 0.07) * 1.2 - scroll * 4,
      );
      DUMMY.rotation.set(0.4 + elapsed * 0.15, i * 0.7, 0.2);
      DUMMY.scale.setScalar(0.5 + (i % 4) * 0.16);
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
    finGeo.dispose();
    finMat.dispose();
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
  envScene.background = new Color(0x1c1828);
  const card = new PlaneGeometry(16, 16);
  const slit = new PlaneGeometry(1.8, 22);
  const sun = new Mesh(card, new MeshBasicMaterial({ color: 0xffc070 }));
  sun.position.set(-2.8, 10.4, 5.2);
  sun.rotation.x = Math.PI / 2;
  const warm = new Mesh(card, new MeshBasicMaterial({ color: 0xe8c090 }));
  warm.position.set(-8.2, 3.4, 2.2);
  warm.rotation.y = Math.PI / 2;
  const fill = new Mesh(card, new MeshBasicMaterial({ color: 0x6aa8cc }));
  fill.position.set(8.4, 1.6, 2.4);
  fill.rotation.y = -Math.PI / 2;
  const ground = new Mesh(card, new MeshBasicMaterial({ color: 0x2c241c }));
  ground.position.set(0, -6.2, 0);
  ground.rotation.x = -Math.PI / 2;
  const beam = new Mesh(slit, new MeshBasicMaterial({ color: 0xffe6b8 }));
  beam.position.set(0.6, 3.4, 8.4);
  const cool = new Mesh(slit, new MeshBasicMaterial({ color: 0x9ecce8 }));
  cool.position.set(-4.8, 2.8, 7.6);
  const zenith = new Mesh(card, new MeshBasicMaterial({ color: 0x243048 }));
  zenith.position.set(0, 11, 0);
  zenith.rotation.x = Math.PI / 2;
  envScene.add(sun, warm, fill, ground, beam, cool, zenith);
  const pmrem = new PMREMGenerator(renderer);
  const target: WebGLRenderTarget = pmrem.fromScene(envScene, 0.035);
  card.dispose();
  slit.dispose();
  sun.material.dispose();
  warm.material.dispose();
  fill.material.dispose();
  ground.material.dispose();
  beam.material.dispose();
  cool.material.dispose();
  zenith.material.dispose();
  pmrem.dispose();
  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
