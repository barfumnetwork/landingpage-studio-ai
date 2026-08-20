import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector2,
  type Material,
} from 'three';
import { createGlassMaterial } from './phoenixGlass';

export interface PhoenixRig {
  root: Group;
  body: Group;
  leftWing: Group;
  rightWing: Group;
  tail: Group;
  detached: Mesh;
  feathers: Mesh[];
  geometries: BufferGeometry[];
  materials: Material[];
}

type SurfaceFn = (u: number, v: number, side: number) => [number, number, number];

function createSurface(point: SurfaceFn, segsU: number, segsV: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const cols = segsV + 1;

  for (let i = 0; i <= segsU; i += 1) {
    const u = i / segsU;
    for (let j = 0; j <= segsV; j += 1) {
      const v = (j / segsV) * 2 - 1;
      const [x, y, z] = point(u, v, 1);
      positions.push(x, y, z);
      uvs.push(u, j / segsV);
    }
  }

  const at = (i: number, j: number) => i * cols + j;
  for (let i = 0; i < segsU; i += 1) {
    for (let j = 0; j < segsV; j += 1) {
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function createFeatherGeometry(
  length: number,
  width: number,
  thickness: number,
  curl: number,
  detail: number,
): BufferGeometry {
  return createSurface((u, v, side) => {
    const uTip = u ** 0.88;
    const belly = Math.sin(Math.PI * Math.min(1, u * 1.03) ** 0.52) ** 0.62;
    const tipCut = u > 0.74 ? 1 - ((u - 0.74) / 0.26) ** 1.35 : 1;
    const env = Math.max(0.045, belly * Math.max(0.05, tipCut));
    const barb = Math.sin(u * 7) * 0.01 * Math.abs(v);
    const x = uTip * length;
    const z = v * width * 0.5 * env + barb * Math.sign(v || 1);
    const camber = Math.sin(u * Math.PI) * curl;
    const ridge = Math.exp(-v * v * 14) * thickness * 1.35;
    const y = camber + side * (thickness * 0.18 + ridge);
    return [x, y, z];
  }, Math.max(10, detail), 7);
}

function createWingPlanform(span: number, chord: number, detail: number): BufferGeometry {
  return createSurface((u, v, side) => {
    const root = 0.42 + u * 0.18;
    const mid = Math.sin(Math.PI * Math.min(1, u * 1.08) ** 0.48) ** 0.5;
    const tip = u > 0.72 ? 1 - ((u - 0.72) / 0.28) ** 1.15 : 1;
    const env = Math.max(0.08, (root * 0.25 + mid * 0.75) * Math.max(0.12, tip));
    const lead = -chord * 0.3 * env;
    const scallop = v > 0.12 ? Math.sin(u * Math.PI * 6.5) * chord * 0.055 * u : 0;
    const trail = chord * 0.82 * env + scallop;
    const x = u * span;
    const z = lead + (trail - lead) * (v * 0.5 + 0.5) + u * u * span * 0.32;
    const arch = Math.sin(u * Math.PI) * 0.42;
    const camber = Math.sin((v * 0.5 + 0.5) * Math.PI) * 0.14 * (1 - u * 0.35);
    const thick = (0.055 + (1 - Math.abs(v)) * 0.035) * (1 - u * 0.38);
    return [x, arch + camber + side * thick, z];
  }, Math.max(12, detail), 8);
}

function createFuselage(segments: number): BufferGeometry {
  const pts = [
    new Vector2(0.02, -1.18),
    new Vector2(0.08, -0.98),
    new Vector2(0.15, -0.62),
    new Vector2(0.2, -0.28),
    new Vector2(0.24, 0.08),
    new Vector2(0.22, 0.38),
    new Vector2(0.13, 0.66),
    new Vector2(0.1, 0.88),
    new Vector2(0.145, 1.04),
    new Vector2(0.08, 1.16),
    new Vector2(0.025, 1.26),
  ];
  const geo = new LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2);
  geo.rotateY(Math.PI);
  geo.computeVertexNormals();
  return geo;
}

function yawFor(side: number, sweep: number): number {
  return side > 0 ? sweep : Math.PI - sweep;
}

function rememberRest(mesh: Mesh): void {
  mesh.userData.restX = mesh.rotation.x;
  mesh.userData.restY = mesh.rotation.y;
  mesh.userData.restZ = mesh.rotation.z;
}

export function createPhoenixRig(compact: boolean): PhoenixRig {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const feathers: Mesh[] = [];

  const shell = createGlassMaterial({
    tint: 0x3a3530,
    rim: 0xe6cfa5,
    absorb: 0x0c0a0c,
    opacity: compact ? 0.18 : 0.13,
    iri: 0.07,
    gain: 0.92,
  });
  const edge = createGlassMaterial({
    tint: 0x5a4c3c,
    rim: 0xf0d8b0,
    absorb: 0x120e0c,
    opacity: 0.2,
    iri: 0.06,
    gain: 1.0,
  });
  const core = new MeshStandardMaterial({
    color: 0x151210,
    roughness: 0.38,
    metalness: 0.42,
    envMapIntensity: 0.7,
  });
  const eyeMat = new MeshStandardMaterial({
    color: 0x1a1210,
    roughness: 0.18,
    metalness: 0.35,
  });
  materials.push(shell, edge, core, eyeMat);

  const root = new Group();
  const body = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const tail = new Group();
  root.add(body, leftWing, rightWing, tail);

  const fuseGeo = createFuselage(compact ? 16 : 28);
  geometries.push(fuseGeo);
  const inner = new Mesh(fuseGeo, core);
  inner.scale.setScalar(0.46);
  body.add(inner);
  const outer = new Mesh(fuseGeo, shell);
  body.add(outer);

  const beakGeo = new ConeGeometry(0.042, 0.28, compact ? 8 : 12);
  geometries.push(beakGeo);
  const beak = new Mesh(beakGeo, edge);
  beak.rotation.x = -Math.PI / 2;
  beak.position.set(0, 0.12, -1.38);
  body.add(beak);

  const eyeGeo = new SphereGeometry(0.028, 8, 6);
  geometries.push(eyeGeo);
  for (const side of [-1, 1]) {
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.09, 0.18, -1.16);
    body.add(eye);
  }

  const detail = compact ? 11 : 18;
  const crestCount = compact ? 4 : 6;
  for (let i = 0; i < crestCount; i += 1) {
    const t = i / Math.max(crestCount - 1, 1);
    const geo = createFeatherGeometry(0.42 + t * 0.38, 0.12 + (1 - t) * 0.05, 0.018, 0.07, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 2 === 0 ? edge : shell);
    mesh.position.set((t - 0.48) * 0.08, 0.28, -1.06);
    mesh.rotation.set(0.12, (t - 0.5) * 0.22, Math.PI * 0.4 + (t - 0.5) * 0.16);
    rememberRest(mesh);
    body.add(mesh);
    feathers.push(mesh);
  }

  function placeWing(wing: Group, side: number, spanScale: number): Mesh | null {
    wing.position.set(side * 0.2, 0.12, -0.18);
    wing.rotation.x = 0.16;
    wing.rotation.y = side * 0.1;
    const span = (compact ? 1.85 : 2.55) * spanScale;
    const sailGeo = createWingPlanform(span, compact ? 0.95 : 1.22, compact ? 12 : 18);
    geometries.push(sailGeo);
    const sail = new Mesh(sailGeo, shell);
    sail.rotation.y = yawFor(side, 0.08);
    wing.add(sail);

    const secondaries = compact ? 4 : 6;
    for (let i = 0; i < secondaries; i += 1) {
      const t = 0.12 + (i / Math.max(secondaries - 1, 1)) * 0.4;
      const geo = createFeatherGeometry(0.72 + t * 0.55, 0.4 - t * 0.08, 0.026, 0.08, detail);
      geometries.push(geo);
      const mesh = new Mesh(geo, shell);
      mesh.position.set(side * 0.04, 0.06 + Math.sin(t * Math.PI) * 0.08, 0.02 + t * 0.16);
      mesh.rotation.set(0.1, yawFor(side, 0.08 + t * 0.28), side * -0.06);
      rememberRest(mesh);
      wing.add(mesh);
      feathers.push(mesh);
    }

    const primaries = compact ? 5 : 8;
    let last: Mesh | null = null;
    for (let i = 0; i < primaries; i += 1) {
      const t = 0.48 + (i / Math.max(primaries - 1, 1)) * 0.5;
      const len = 0.85 + t * (compact ? 0.85 : 1.25);
      const geo = createFeatherGeometry(len, 0.34 - t * 0.12, 0.024, 0.1 + t * 0.06, detail);
      geometries.push(geo);
      const mesh = new Mesh(geo, t > 0.82 ? edge : shell);
      mesh.position.set(side * (span * t * 0.16), 0.1 + Math.sin(t * Math.PI) * 0.16, 0.18 + t * 0.38);
      mesh.rotation.set(0.08, yawFor(side, 0.16 + t * 0.48), side * (-0.05 - t * 0.04));
      rememberRest(mesh);
      wing.add(mesh);
      feathers.push(mesh);
      last = mesh;
    }
    return last;
  }

  placeWing(leftWing, -1, 0.97);
  const rightTip = placeWing(rightWing, 1, 1.03);

  const tailCount = compact ? 6 : 9;
  for (let i = 0; i < tailCount; i += 1) {
    const t = i / Math.max(tailCount - 1, 1);
    const geo = createFeatherGeometry(1.15 + t * 1.55, 0.2 + (1 - t) * 0.1, 0.02, 0.18, detail);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 3 === 0 ? edge : shell);
    mesh.position.set((t - 0.46) * 0.26, -0.12 - t * 0.2, 0.78);
    mesh.rotation.set(0.22 + t * 0.1, Math.PI * 0.5 + (t - 0.5) * 0.24, (t - 0.48) * 0.1);
    rememberRest(mesh);
    tail.add(mesh);
    feathers.push(mesh);
  }

  const detachGeo = createFeatherGeometry(compact ? 1.35 : 1.85, 0.38, 0.032, 0.14, compact ? 14 : 24);
  geometries.push(detachGeo);
  const detached = new Mesh(detachGeo, edge);
  const shaftGeo = new CylinderGeometry(0.01, 0.004, compact ? 1.3 : 1.78, 6);
  geometries.push(shaftGeo);
  shaftGeo.rotateZ(-Math.PI / 2);
  const shaft = new Mesh(shaftGeo, edge);
  shaft.position.x = compact ? 0.62 : 0.86;
  detached.add(shaft);
  if (rightTip) {
    detached.position.copy(rightTip.position);
    detached.rotation.copy(rightTip.rotation);
    rightTip.visible = false;
  } else {
    detached.position.set(0.55, 0.12, 0.42);
    detached.rotation.set(0.08, 0.55, -0.06);
  }
  rememberRest(detached);
  rightWing.add(detached);
  feathers.push(detached);

  root.scale.setScalar(compact ? 1.12 : 1.16);
  return {
    root,
    body,
    leftWing,
    rightWing,
    tail,
    detached,
    feathers,
    geometries,
    materials,
  };
}
