import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  TetrahedronGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import { mulberry32 } from '../../generator/mapping/assetHelpers';
import styles from './ChamberVoid.module.css';

const SHARD_COUNT = 56;
const DEBRIS_COUNT = 32;

function startVoid(node: HTMLDivElement): (() => void) | undefined {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
  } catch {
    node.classList.add(styles.fallback);
    return undefined;
  }

  const scene = new Scene();
  scene.background = new Color(0x050506);
  scene.fog = new Fog(0x050506, 5.5, 15);

  const camera = new PerspectiveCamera(28, 1, 0.1, 40);
  camera.position.set(0, 5.4, 11);

  const pixelCap = window.matchMedia('(max-width: 720px)').matches ? 1.15 : 1.6;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelCap));
  renderer.setClearColor(0x050506, 1);
  node.appendChild(renderer.domElement);

  const wallMat = new MeshStandardMaterial({
    color: 0x121214,
    roughness: 0.9,
    metalness: 0.08,
  });
  const floorMat = new MeshPhysicalMaterial({
    color: 0x080809,
    roughness: 0.12,
    metalness: 0.82,
    reflectivity: 0.9,
  });
  const shardMat = new MeshPhysicalMaterial({
    color: 0xd4cbb8,
    roughness: 0.22,
    metalness: 0.58,
    emissive: new Color(0x2a2418),
    emissiveIntensity: 0.18,
  });
  const debrisMat = new MeshStandardMaterial({
    color: 0x9a9284,
    roughness: 0.48,
    metalness: 0.32,
    transparent: true,
    opacity: 0.86,
  });

  const wallGeo = new PlaneGeometry(10, 6);
  const floorGeo = new PlaneGeometry(12, 12);
  const back = new Mesh(wallGeo, wallMat);
  back.position.z = -3.2;
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.15;
  scene.add(back, floor);

  const ambient = new AmbientLight(0xe7e2d6, 0.14);
  const key = new DirectionalLight(0xf4f0e6, 1.05);
  key.position.set(-3.2, 5.4, 4.2);
  const fill = new DirectionalLight(0x8899aa, 0.22);
  fill.position.set(4, 1.4, 2);
  const burst = new PointLight(0xfff1d6, 0, 9, 1.6);
  burst.position.set(0, 0.4, 0.2);
  scene.add(ambient, key, fill, burst);

  const shardGeo = new TetrahedronGeometry(0.28, 0);
  const debrisGeo = new TetrahedronGeometry(0.09, 0);
  const shards = new InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  const debris = new InstancedMesh(debrisGeo, debrisMat, DEBRIS_COUNT);
  const dummy = new Object3D();
  const rand = mulberry32(0xc4a4be4);
  const origins: Vector3[] = [];
  const velocities: Vector3[] = [];
  const spins: Vector3[] = [];
  const scales: Vector3[] = [];
  const rest: Array<{ x: number; y: number; z: number; rx: number; ry: number }> = [];
  const debrisOrigin: Vector3[] = [];
  const debrisVel: Vector3[] = [];
  const debrisSpin: Vector3[] = [];

  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const col = (i % 8) - 3.5;
    const row = Math.floor(i / 8) - 3;
    rest.push({
      x: col * 0.38,
      y: -1.55 + row * 0.07,
      z: -1.05 + row * -0.16,
      rx: 0.14 * row + (rand() - 0.5) * 0.4,
      ry: 0.09 * col + (rand() - 0.5) * 0.5,
    });
    origins.push(new Vector3((rand() - 0.5) * 0.28, 0.35 + rand() * 0.55, 0.12));
    velocities.push(
      new Vector3((rand() - 0.5) * 7.2, 2.6 + rand() * 5.4, (rand() - 0.5) * 3.8 - 1.8),
    );
    spins.push(new Vector3((rand() - 0.5) * 10, (rand() - 0.5) * 14, (rand() - 0.5) * 8));
    scales.push(new Vector3(0.45 + rand() * 1.55, 0.28 + rand() * 2.05, 0.16 + rand() * 0.72));
  }

  for (let i = 0; i < DEBRIS_COUNT; i += 1) {
    debrisOrigin.push(new Vector3((rand() - 0.5) * 0.2, 0.2 + rand() * 0.4, 0));
    debrisVel.push(
      new Vector3((rand() - 0.5) * 9.4, 1.4 + rand() * 6.2, (rand() - 0.5) * 5.2 - 0.8),
    );
    debrisSpin.push(new Vector3((rand() - 0.5) * 16, (rand() - 0.5) * 18, (rand() - 0.5) * 12));
  }

  scene.add(shards, debris);

  const architecture = new Group();
  const pillarGeo = new BoxGeometry(0.12, 3.4, 0.12);
  const pillarMat = new MeshStandardMaterial({
    color: 0x1c1c20,
    roughness: 0.78,
    metalness: 0.2,
  });
  for (const x of [-2.6, 2.6]) {
    const pillar = new Mesh(pillarGeo, pillarMat);
    pillar.position.set(x, -0.45, -2.4);
    architecture.add(pillar);
  }
  scene.add(architecture);

  let frame = 0;
  let elapsed = 0;
  let last = performance.now();
  let running = true;
  let pointerX = 0;
  let pointerY = 0;
  let dampX = 0;
  let dampY = 0;
  const camTarget = new Vector3(0, -0.35, -1.4);

  function resize(): void {
    const width = node.clientWidth || 1;
    const height = node.clientHeight || 1;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(node);
  resize();

  const visibility = new IntersectionObserver(
    (entries) => {
      running = entries.some((entry) => entry.isIntersecting);
    },
    { threshold: 0.08 },
  );
  visibility.observe(node);

  function onContextLost(event: Event): void {
    event.preventDefault();
    running = false;
    window.cancelAnimationFrame(frame);
    node.classList.add(styles.fallback);
  }

  function onPointer(event: PointerEvent): void {
    const rect = node.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  }

  function onHidden(): void {
    running = document.visibilityState === 'visible';
  }

  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  node.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onHidden);

  function tick(now: number): void {
    frame = window.requestAnimationFrame(tick);
    if (!running) return;
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += delta;
    dampX += (pointerX - dampX) * 0.045;
    dampY += (pointerY - dampY) * 0.045;

    const descend = 1 - Math.exp(-elapsed * 0.85);
    const kick = Math.max(0, 1 - elapsed / 0.62);
    camera.position.x = dampX * 0.55 + Math.sin(elapsed * 46) * kick * 0.08;
    camera.position.y =
      5.4 + (0.22 - 5.4) * descend + Math.sin(elapsed * 0.11) * 0.05 + Math.cos(elapsed * 39) * kick * 0.05;
    camera.position.z = 11 + (6.1 - 11) * descend;
    camTarget.x = dampX * 0.35;
    camTarget.y = -0.2 - dampY * 0.18;
    camera.lookAt(camTarget);

    const shatterT = Math.min(elapsed / 1.28, 1);
    const settle = shatterT * shatterT * (3 - 2 * shatterT);
    const stretch = 1 - settle;
    burst.intensity = 3.2 * Math.exp(-elapsed * 2.35) + 0.12;
    key.intensity = 1.05 + kick * 0.85;
    shardMat.emissiveIntensity = 0.18 + kick * 1.4;

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const origin = origins[i];
      const vel = velocities[i];
      const spin = spins[i];
      const home = rest[i];
      const scale = scales[i];
      const burstX = origin.x + vel.x * shatterT;
      const burstY = origin.y + vel.y * shatterT - 4.8 * shatterT * shatterT;
      const burstZ = origin.z + vel.z * shatterT;
      dummy.position.set(
        burstX + (home.x - burstX) * settle,
        burstY + (home.y - burstY) * settle,
        burstZ + (home.z - burstZ) * settle,
      );
      dummy.rotation.set(
        spin.x * stretch * 0.42 + home.rx,
        spin.y * stretch * 0.5 + home.ry,
        spin.z * stretch * 0.28,
      );
      dummy.scale.set(
        scale.x * (1 + Math.abs(vel.x) * stretch * 0.06),
        scale.y * (1 + Math.abs(vel.y) * stretch * 0.08),
        scale.z,
      );
      dummy.updateMatrix();
      shards.setMatrixAt(i, dummy.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < DEBRIS_COUNT; i += 1) {
      const origin = debrisOrigin[i];
      const vel = debrisVel[i];
      const spin = debrisSpin[i];
      dummy.position.set(
        origin.x + vel.x * shatterT,
        origin.y + vel.y * shatterT - 5.6 * shatterT * shatterT,
        origin.z + vel.z * shatterT,
      );
      dummy.rotation.set(spin.x * elapsed, spin.y * elapsed, spin.z * elapsed);
      dummy.scale.setScalar(0.55 + (1 - settle) * 0.7);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    debrisMat.opacity = 0.92 * (1 - settle * 0.72);
    renderer.render(scene, camera);
  }

  frame = window.requestAnimationFrame(tick);

  return () => {
    running = false;
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    visibility.disconnect();
    document.removeEventListener('visibilitychange', onHidden);
    node.removeEventListener('pointermove', onPointer);
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    wallGeo.dispose();
    floorGeo.dispose();
    shardGeo.dispose();
    debrisGeo.dispose();
    pillarGeo.dispose();
    wallMat.dispose();
    floorMat.dispose();
    shardMat.dispose();
    debrisMat.dispose();
    pillarMat.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

export default function ChamberVoid() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startVoid(node);
  }, []);

  return <div ref={hostRef} className={styles.void} aria-hidden="true" />;
}
