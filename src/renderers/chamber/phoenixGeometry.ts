import {
  BufferGeometry,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Material,
} from 'three';
import { createGlassMaterial } from './phoenixGlass';

export interface PhoenixRig {
  root: Group;
  leftWing: Group;
  rightWing: Group;
  tail: Group;
  detached: Mesh;
  feathers: Mesh[];
  geometries: BufferGeometry[];
  materials: Material[];
}

function det(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function createFeatherGeometry(
  length: number,
  width: number,
  thickness: number,
  curl: number,
  detail: number,
): BufferGeometry {
  const segsU = Math.max(8, detail);
  const segsV = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segsV + 1;

  function point(u: number, v: number, side: number): [number, number, number] {
    const uTip = u ** 0.9;
    const belly = Math.sin(Math.PI * Math.min(1, u * 1.02) ** 0.56) ** 0.68;
    const tipCut = u > 0.78 ? 1 - ((u - 0.78) / 0.22) ** 1.45 : 1;
    const env = Math.max(0.05, belly * Math.max(0.06, tipCut));
    const x = uTip * length;
    const z = v * width * 0.5 * env;
    const camber = Math.sin(u * Math.PI) * curl;
    const ridge = (1 - Math.abs(v)) ** 2.15 * thickness * 0.9;
    const barb = Math.sin(u * 26 + v * 5.2) * 0.0032 * (1 - Math.abs(v));
    const y = camber + side * (thickness * 0.2 + ridge) + barb * side;
    return [x, y, z];
  }

  for (const side of [1, -1]) {
    for (let i = 0; i <= segsU; i += 1) {
      const u = i / segsU;
      for (let j = 0; j <= segsV; j += 1) {
        const v = (j / segsV) * 2 - 1;
        const [x, y, z] = point(u, v, side);
        positions.push(x, y, z);
        uvs.push(u, j / segsV);
      }
    }
  }

  const topOff = 0;
  const botOff = (segsU + 1) * cols;
  const at = (i: number, j: number, off: number) => off + i * cols + j;

  for (let i = 0; i < segsU; i += 1) {
    for (let j = 0; j < segsV; j += 1) {
      const a = at(i, j, topOff);
      const b = at(i + 1, j, topOff);
      const c = at(i + 1, j + 1, topOff);
      const d = at(i, j + 1, topOff);
      indices.push(a, b, d, b, c, d);
    }
  }
  for (let i = 0; i < segsU; i += 1) {
    for (let j = 0; j < segsV; j += 1) {
      const a = at(i, j, botOff);
      const b = at(i + 1, j, botOff);
      const c = at(i + 1, j + 1, botOff);
      const d = at(i, j + 1, botOff);
      indices.push(a, d, b, b, d, c);
    }
  }
  for (let i = 0; i < segsU; i += 1) {
    for (const j of [0, segsV]) {
      const a = at(i, j, topOff);
      const b = at(i + 1, j, topOff);
      const c = at(i + 1, j, botOff);
      const d = at(i, j, botOff);
      if (j === 0) indices.push(a, d, b, b, d, c);
      else indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createPhoenixRig(compact: boolean): PhoenixRig {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const feathers: Mesh[] = [];

  const shell = createGlassMaterial({
    tint: 0xdbe6ee,
    rim: 0xffe4bc,
    absorb: 0x2c2433,
    opacity: compact ? 0.5 : 0.38,
    iri: compact ? 0.08 : 0.16,
    gain: 1.18,
  });
  const rimShell = createGlassMaterial({
    tint: 0xf3e2c4,
    rim: 0xfff1d4,
    absorb: 0x3a2c28,
    opacity: 0.55,
    iri: 0.1,
    gain: 1.28,
  });
  const core = new MeshStandardMaterial({
    color: 0x241820,
    roughness: 0.28,
    metalness: 0.55,
    envMapIntensity: 1.35,
  });
  const eyeMat = new MeshStandardMaterial({
    color: 0x1a1210,
    roughness: 0.22,
    metalness: 0.4,
    envMapIntensity: 0.8,
  });
  materials.push(shell, rimShell, core, eyeMat);

  const root = new Group();
  const body = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const tail = new Group();
  root.add(body, leftWing, rightWing, tail);

  const torsoGeo = new SphereGeometry(0.42, compact ? 16 : 28, compact ? 12 : 20);
  geometries.push(torsoGeo);
  const torso = new Mesh(torsoGeo, core);
  torso.scale.set(0.72, 0.52, 1.42);
  torso.position.set(0, 0.02, 0.12);
  body.add(torso);

  const chestGeo = new SphereGeometry(0.38, compact ? 14 : 24, compact ? 10 : 18);
  geometries.push(chestGeo);
  const chest = new Mesh(chestGeo, shell);
  chest.scale.set(0.92, 0.7, 1.05);
  chest.position.set(0, 0.02, -0.28);
  body.add(chest);

  const keelGeo = new SphereGeometry(0.22, 12, 10);
  geometries.push(keelGeo);
  const keel = new Mesh(keelGeo, rimShell);
  keel.scale.set(0.55, 0.38, 1.65);
  keel.position.set(0, -0.08, -0.02);
  body.add(keel);

  const neckGeo = new SphereGeometry(0.14, 12, 10);
  geometries.push(neckGeo);
  const neck = new Mesh(neckGeo, shell);
  neck.scale.set(0.72, 0.62, 1.85);
  neck.position.set(0, 0.16, -0.92);
  neck.rotation.x = -0.28;
  body.add(neck);

  const headGeo = new SphereGeometry(0.16, compact ? 12 : 16, 12);
  geometries.push(headGeo);
  const head = new Mesh(headGeo, shell);
  head.scale.set(0.82, 0.68, 1.12);
  head.position.set(0, 0.28, -1.28);
  body.add(head);

  const beakGeo = new ConeGeometry(0.055, 0.28, compact ? 8 : 12);
  geometries.push(beakGeo);
  const beak = new Mesh(beakGeo, rimShell);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.22, -1.52);
  body.add(beak);

  const eyeGeo = new SphereGeometry(0.028, 8, 6);
  geometries.push(eyeGeo);
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.09, 0.32, -1.36);
    body.add(eye);
  }

  const detail = compact ? 10 : 18;
  const crestCount = compact ? 4 : 6;
  for (let i = 0; i < crestCount; i += 1) {
    const t = i / Math.max(crestCount - 1, 1);
    const geo = createFeatherGeometry(0.48 + t * 0.32, 0.1 + (1 - t) * 0.04, 0.018, 0.08, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 2 === 0 ? rimShell : shell);
    mesh.position.set((t - 0.5) * 0.07, 0.4, -1.2);
    mesh.rotation.set(0.18, (t - 0.5) * 0.28, Math.PI * 0.42 + (t - 0.5) * 0.18);
    body.add(mesh);
    feathers.push(mesh);
  }

  function yawFor(side: number, sweep: number): number {
    return side > 0 ? sweep : Math.PI - sweep;
  }

  function placeWing(wing: Group, side: number): void {
    wing.position.set(side * 0.3, 0.1, -0.1);
    const coverts = compact ? 5 : 8;
    const flights = compact ? 7 : 11;

    for (let i = 0; i < coverts; i += 1) {
      const t = i / Math.max(coverts - 1, 1);
      const len = 0.92 + t * 0.78;
      const wid = 0.3 + (1 - t) * 0.14;
      const geo = createFeatherGeometry(len, wid, 0.03, 0.1 + t * 0.04, detail);
      geometries.push(geo);
      const mesh = new Mesh(geo, t > 0.7 ? rimShell : shell);
      mesh.position.set(side * 0.05, 0.1 + Math.sin(t * Math.PI) * 0.05, -0.2 + t * 0.2);
      mesh.rotation.set(0.22, yawFor(side, 0.06 + t * 0.24), side * -0.1);
      wing.add(mesh);
      feathers.push(mesh);
    }

    for (let i = 0; i < flights; i += 1) {
      const t = i / Math.max(flights - 1, 1);
      const len = 1.55 + t * (compact ? 1.45 : 2.2);
      const wid = 0.24 + (1 - t) * 0.18;
      const geo = createFeatherGeometry(len, wid, 0.024, 0.12 + t * 0.14, detail);
      geometries.push(geo);
      const mesh = new Mesh(geo, t > 0.82 ? rimShell : shell);
      mesh.position.set(
        side * 0.06,
        0.02 + Math.sin(t * Math.PI) * 0.08 - t * 0.1,
        -0.04 + t * 0.52,
      );
      mesh.rotation.set(
        0.14 + t * 0.08 + (det(i, 3) - 0.5) * 0.04,
        yawFor(side, 0.14 + t * 0.5),
        side * (-0.05 - t * 0.06),
      );
      wing.add(mesh);
      feathers.push(mesh);
    }
  }

  placeWing(leftWing, -1);
  placeWing(rightWing, 1);

  const tailCount = compact ? 7 : 12;
  for (let i = 0; i < tailCount; i += 1) {
    const t = i / Math.max(tailCount - 1, 1);
    const geo = createFeatherGeometry(1.4 + t * 1.7, 0.17 + (1 - t) * 0.07, 0.02, 0.18, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 3 === 0 ? rimShell : shell);
    mesh.position.set((t - 0.5) * 0.28, -0.16 - t * 0.2, 0.78);
    mesh.rotation.set(0.22 + t * 0.1, Math.PI * 0.5 + (t - 0.5) * 0.28, (t - 0.5) * 0.1);
    tail.add(mesh);
    feathers.push(mesh);
  }

  const detachGeo = createFeatherGeometry(compact ? 1.4 : 1.95, 0.3, 0.034, 0.16, compact ? 12 : 22);
  geometries.push(detachGeo);
  const detached = new Mesh(detachGeo, rimShell);
  detached.position.set(0.12, -0.2, 0.92);
  detached.rotation.set(0.24, Math.PI * 0.5 + 0.08, 0.06);
  tail.add(detached);
  feathers.push(detached);

  const footGeo = new SphereGeometry(0.06, 8, 6);
  geometries.push(footGeo);
  const footMat = new MeshStandardMaterial({
    color: 0xcbb089,
    roughness: 0.24,
    metalness: 0.42,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 0.7,
    side: DoubleSide,
  });
  materials.push(footMat);
  for (const side of [-1, 1]) {
    const foot = new Mesh(footGeo, footMat);
    foot.scale.set(0.55, 0.35, 1.1);
    foot.position.set(side * 0.1, -0.22, 0.18);
    body.add(foot);
  }

  root.scale.setScalar(compact ? 0.92 : 1.08);
  return {
    root,
    leftWing,
    rightWing,
    tail,
    detached,
    feathers,
    geometries,
    materials,
  };
}
