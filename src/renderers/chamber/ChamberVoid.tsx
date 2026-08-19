import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer,
} from 'three';
import styles from './ChamberVoid.module.css';

function startVoid(node: HTMLDivElement): (() => void) | undefined {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    node.classList.add(styles.fallback);
    return undefined;
  }

  const scene = new Scene();
  scene.background = new Color(0x050506);

  const camera = new PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.2, 6.2);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  node.appendChild(renderer.domElement);

  const matWall = new MeshStandardMaterial({
    color: 0x111113,
    roughness: 0.92,
    metalness: 0.02,
  });
  const matFloor = new MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.96,
    metalness: 0,
  });

  const wallGeo = new PlaneGeometry(8, 5);
  const floorGeo = new PlaneGeometry(8, 8);
  const back = new Mesh(wallGeo, matWall);
  back.position.z = -2.4;
  const floor = new Mesh(floorGeo, matFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.4;
  scene.add(back, floor);

  const ambient = new AmbientLight(0xe7e2d6, 0.18);
  const key = new DirectionalLight(0xe7e2d6, 0.55);
  key.position.set(-2.4, 3.2, 4);
  scene.add(ambient, key);

  let frame = 0;
  let elapsed = 0;
  let last = performance.now();

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

  function onContextLost(event: Event): void {
    event.preventDefault();
    window.cancelAnimationFrame(frame);
    node.classList.add(styles.fallback);
  }

  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  function tick(now: number): void {
    const delta = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += delta;
    camera.position.x = Math.sin(elapsed * 0.12) * 0.35;
    camera.position.y = 0.18 + Math.sin(elapsed * 0.09) * 0.08;
    camera.lookAt(0, -0.2, -1.2);
    renderer.render(scene, camera);
    frame = window.requestAnimationFrame(tick);
  }

  frame = window.requestAnimationFrame(tick);

  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    wallGeo.dispose();
    floorGeo.dispose();
    matWall.dispose();
    matFloor.dispose();
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
