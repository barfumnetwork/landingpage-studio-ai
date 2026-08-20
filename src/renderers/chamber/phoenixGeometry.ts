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
    const barb = 0;
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

export function createWingSailGeometry(
  span: number,
  chord: number,
  detail: number,
): BufferGeometry {
  const segsU = Math.max(10, detail);
  const segsV = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segsV + 1;

  function point(u: number, v: number, side: number): [number, number, number] {
    const taper = 1 - u ** 1.15 * 0.62;
    const sweep = u * u * span * 0.28;
    const lead = -chord * 0.32 * taper;
    const trail = chord * 0.72 * taper * (1 - u ** 1.7 * 0.28);
    const x = u * span;
    const z = lead + (trail - lead) * (v * 0.5 + 0.5) + sweep;
    const camber = Math.sin((v * 0.5 + 0.5) * Math.PI) * 0.16 * (1 - u * 0.45);
    const thick = (0.045 + (1 - Math.abs(v)) * 0.03) * taper;
    return [x, camber + side * thick, z];
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
    tint: 0x7d8c9a,
    rim: 0xe8c9a0,
    absorb: 0x121018,
    opacity: compact ? 0.28 : 0.2,
    iri: compact ? 0.06 : 0.1,
    gain: 0.94,
  });
  const rimShell = createGlassMaterial({
    tint: 0xb7a78a,
    rim: 0xf3dfc0,
    absorb: 0x1a1410,
    opacity: 0.26,
    iri: 0.08,
    gain: 1.02,
  });
  const core = new MeshStandardMaterial({
    color: 0x1a1418,
    roughness: 0.22,
    metalness: 0.62,
    envMapIntensity: 1.1,
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
  torso.scale.set(0.42, 0.32, 0.92);
  torso.position.set(0, 0.02, 0.08);
  body.add(torso);

  const chestGeo = new SphereGeometry(0.38, compact ? 14 : 24, compact ? 10 : 18);
  geometries.push(chestGeo);
  const chest = new Mesh(chestGeo, shell);
  chest.scale.set(0.88, 0.62, 1.18);
  chest.position.set(0, 0.04, -0.12);
  body.add(chest);

  const neckGeo = new SphereGeometry(0.14, 12, 10);
  geometries.push(neckGeo);
  const neck = new Mesh(neckGeo, shell);
  neck.scale.set(0.7, 0.58, 1.7);
  neck.position.set(0, 0.14, -0.82);
  neck.rotation.x = -0.22;
  body.add(neck);

  const headGeo = new SphereGeometry(0.16, compact ? 12 : 16, 12);
  geometries.push(headGeo);
  const head = new Mesh(headGeo, shell);
  head.scale.set(0.78, 0.64, 1.05);
  head.position.set(0, 0.24, -1.18);
  body.add(head);

  const beakGeo = new ConeGeometry(0.048, 0.26, compact ? 8 : 12);
  geometries.push(beakGeo);
  const beak = new Mesh(beakGeo, rimShell);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.2, -1.42);
  body.add(beak);

  const eyeGeo = new SphereGeometry(0.026, 8, 6);
  geometries.push(eyeGeo);
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.085, 0.28, -1.26);
    body.add(eye);
  }

  const detail = compact ? 10 : 18;
  const crestCount = compact ? 4 : 6;
  for (let i = 0; i < crestCount; i += 1) {
    const t = i / Math.max(crestCount - 1, 1);
    const geo = createFeatherGeometry(0.5 + t * 0.34, 0.14 + (1 - t) * 0.05, 0.02, 0.08, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 2 === 0 ? rimShell : shell);
    mesh.position.set((t - 0.5) * 0.07, 0.36, -1.1);
    mesh.rotation.set(0.18, (t - 0.5) * 0.28, Math.PI * 0.42 + (t - 0.5) * 0.18);
    body.add(mesh);
    feathers.push(mesh);
  }

  function yawFor(side: number, sweep: number): number {
    return side > 0 ? sweep : Math.PI - sweep;
  }

  function placeWing(wing: Group, side: number): void {
    wing.position.set(side * 0.22, 0.1, -0.08);
    wing.rotation.x = 0.58;
    const span = compact ? 2.35 : 3.15;
    const sailGeo = createWingSailGeometry(span, compact ? 1.15 : 1.45, compact ? 12 : 20);
    geometries.push(sailGeo);
    const sail = new Mesh(sailGeo, shell);
    sail.rotation.y = yawFor(side, 0.12);
    wing.add(sail);

    const flights = compact ? 3 : 4;
    for (let i = 0; i < flights; i += 1) {
      const t = 0.78 + (i / Math.max(flights - 1, 1)) * 0.2;
      const len = 0.85 + t * (compact ? 0.7 : 1.05);
      const wid = 0.38 + (1 - t) * 0.12;
      const geo = createFeatherGeometry(len, wid, 0.03, 0.08, detail);
      geometries.push(geo);
      const mesh = new Mesh(geo, rimShell);
      mesh.position.set(side * (span * t * 0.18), 0.03, 0.28 + t * 0.18);
      mesh.rotation.set(0.06, yawFor(side, 0.22 + t * 0.28), side * -0.05);
      wing.add(mesh);
      feathers.push(mesh);
    }
  }

  placeWing(leftWing, -1);
  placeWing(rightWing, 1);

  const tailCount = compact ? 6 : 9;
  for (let i = 0; i < tailCount; i += 1) {
    const t = i / Math.max(tailCount - 1, 1);
    const geo = createFeatherGeometry(1.25 + t * 1.45, 0.22 + (1 - t) * 0.1, 0.022, 0.16, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 3 === 0 ? rimShell : shell);
    mesh.position.set((t - 0.5) * 0.22, -0.14 - t * 0.16, 0.7);
    mesh.rotation.set(0.2 + t * 0.08, Math.PI * 0.5 + (t - 0.5) * 0.22, (t - 0.5) * 0.08);
    tail.add(mesh);
    feathers.push(mesh);
  }

  const detachGeo = createFeatherGeometry(compact ? 1.45 : 2.05, 0.42, 0.036, 0.14, compact ? 12 : 22);
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

  root.scale.setScalar(compact ? 1.02 : 1.22);
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
