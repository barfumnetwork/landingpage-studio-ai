import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import { createGlassMaterial } from './phoenixGlass';

export interface PhoenixRig {
  root: Group;
  body: Group;
  leftWing: Group;
  rightWing: Group;
  tail: Group;
  detached: Object3D;
  feathers: Object3D[];
  geometries: BufferGeometry[];
  materials: Material[];
}

export interface PhoenixRigOptions {
  silhouette?: boolean;
  portrait?: boolean;
}

type SpineKnot = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function catmull(a: number, b: number, c: number, d: number, u: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
}

function sampleSpine(knots: SpineKnot[], t: number): SpineKnot {
  const n = knots.length - 1;
  const scaled = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(n - 1, Math.floor(scaled));
  const u = scaled - i;
  const p0 = knots[Math.max(0, i - 1)]!;
  const p1 = knots[i]!;
  const p2 = knots[Math.min(n, i + 1)]!;
  const p3 = knots[Math.min(n, i + 2)]!;
  return {
    x: catmull(p0.x, p1.x, p2.x, p3.x, u),
    y: catmull(p0.y, p1.y, p2.y, p3.y, u),
    z: catmull(p0.z, p1.z, p2.z, p3.z, u),
    rx: Math.max(0.003, catmull(p0.rx, p1.rx, p2.rx, p3.rx, u)),
    ry: Math.max(0.003, catmull(p0.ry, p1.ry, p2.ry, p3.ry, u)),
  };
}

function loftSpine(knots: SpineKnot[], segments: number, radial: number): BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const TMP = new Vector3();
  const FWD = new Vector3();
  const RIGHT = new Vector3();
  const UP = new Vector3();
  const WORLD_UP = new Vector3(0, 1, 0);

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const knot = sampleSpine(knots, t);
    const next = sampleSpine(knots, Math.min(1, t + 1 / segments));
    FWD.set(next.x - knot.x, next.y - knot.y, next.z - knot.z);
    if (FWD.lengthSq() < 1e-8) FWD.set(0, 0, -1);
    FWD.normalize();
    RIGHT.crossVectors(FWD, WORLD_UP);
    if (RIGHT.lengthSq() < 1e-6) RIGHT.set(1, 0, 0);
    RIGHT.normalize();
    UP.crossVectors(RIGHT, FWD).normalize();
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const cs = Math.cos(a);
      const sn = Math.sin(a);
      TMP.copy(RIGHT)
        .multiplyScalar(cs * knot.rx)
        .addScaledVector(UP, sn * knot.ry);
      positions.push(knot.x + TMP.x, knot.y + TMP.y, knot.z + TMP.z);
      uvs.push(t, j / radial);
    }
  }

  const cols = radial + 1;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * cols + j;
      const b = a + cols;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createFuselage(segments: number, radial: number): BufferGeometry {
  return loftSpine(
    [
      { x: 0, y: -0.12, z: 1.22, rx: 0.018, ry: 0.014 },
      { x: 0, y: -0.02, z: 0.82, rx: 0.07, ry: 0.055 },
      { x: 0, y: 0.08, z: 0.38, rx: 0.13, ry: 0.11 },
      { x: 0, y: 0.16, z: 0.02, rx: 0.17, ry: 0.2 },
      { x: 0, y: 0.2, z: -0.28, rx: 0.145, ry: 0.175 },
      { x: 0, y: 0.18, z: -0.52, rx: 0.08, ry: 0.09 },
      { x: 0, y: 0.32, z: -0.78, rx: 0.042, ry: 0.05 },
      { x: 0, y: 0.48, z: -0.98, rx: 0.038, ry: 0.046 },
      { x: 0, y: 0.42, z: -1.16, rx: 0.055, ry: 0.05 },
      { x: 0, y: 0.5, z: -1.34, rx: 0.092, ry: 0.078 },
      { x: 0, y: 0.46, z: -1.5, rx: 0.07, ry: 0.06 },
      { x: 0, y: 0.4, z: -1.64, rx: 0.028, ry: 0.024 },
      { x: 0, y: 0.36, z: -1.78, rx: 0.006, ry: 0.005 },
    ],
    segments,
    radial,
  );
}

function createSkull(segments: number, radial: number): BufferGeometry {
  return loftSpine(
    [
      { x: 0.01, y: 0.0, z: 0.16, rx: 0.042, ry: 0.038 },
      { x: 0.0, y: 0.04, z: 0.02, rx: 0.09, ry: 0.078 },
      { x: 0.0, y: 0.06, z: -0.1, rx: 0.1, ry: 0.088 },
      { x: 0.0, y: 0.02, z: -0.22, rx: 0.072, ry: 0.06 },
      { x: 0.0, y: -0.02, z: -0.32, rx: 0.03, ry: 0.026 },
      { x: 0.0, y: -0.04, z: -0.4, rx: 0.008, ry: 0.007 },
    ],
    segments,
    radial,
  );
}

export function createFeatherGeometry(
  length: number,
  width: number,
  thickness: number,
  curl: number,
  detail: number,
  barbs = 0,
  twist = 0,
): BufferGeometry {
  const segments = Math.max(10, detail);
  const radial = 8;
  const knots: SpineKnot[] = [];
  const steps = 7;
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const belly = Math.sin(Math.PI * Math.min(1, u * 1.04) ** 0.62) ** 0.55;
    const tip = u > 0.7 ? 1 - ((u - 0.7) / 0.3) ** 1.35 : 1;
    const env = Math.max(0.07, belly * Math.max(0.08, tip));
    const notch = barbs > 0 ? 1 - 0.16 * Math.abs(Math.sin(u * Math.PI * barbs)) * (u > 0.12 ? 1 : u / 0.12) : 1;
    knots.push({
      x: u ** 0.92 * length,
      y: Math.sin(u * Math.PI) * curl,
      z: 0,
      rx: Math.max(0.004, thickness * (0.7 + (1 - u) * 0.5)),
      ry: Math.max(0.01, width * 0.5 * env * notch),
    });
  }
  const geo = loftSpine(knots, segments, radial);
  if (twist !== 0) {
    const pos = geo.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const u = Math.min(1, Math.max(0, x / Math.max(length, 0.001)));
        const a = twist * u;
        const cs = Math.cos(a);
        const sn = Math.sin(a);
        pos.setY(i, y * cs - z * sn);
        pos.setZ(i, y * sn + z * cs);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  }
  return geo;
}

function rememberRest(obj: Object3D): void {
  obj.userData.restX = obj.rotation.x;
  obj.userData.restY = obj.rotation.y;
  obj.userData.restZ = obj.rotation.z;
}

function yawFor(side: number, sweep: number): number {
  return side > 0 ? sweep : Math.PI - sweep;
}

function createWingPad(span: number, chord: number, thick: number): BufferGeometry {
  return loftSpine(
    [
      { x: 0.02, y: 0.0, z: 0.0, rx: thick * 0.55, ry: chord * 0.22 },
      { x: span * 0.22, y: 0.05, z: 0.06, rx: thick * 0.9, ry: chord * 0.5 },
      { x: span * 0.48, y: 0.1, z: 0.14, rx: thick * 0.8, ry: chord * 0.58 },
      { x: span * 0.7, y: 0.08, z: 0.26, rx: thick * 0.45, ry: chord * 0.34 },
      { x: span * 0.86, y: 0.04, z: 0.38, rx: thick * 0.16, ry: chord * 0.14 },
    ],
    12,
    8,
  );
}

function addMesh(
  parent: Object3D,
  geo: BufferGeometry,
  mat: Material,
  geometries: BufferGeometry[],
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
): Mesh {
  geometries.push(geo);
  const mesh = new Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  rememberRest(mesh);
  parent.add(mesh);
  return mesh;
}

export function createHeroFeather(
  length: number,
  width: number,
  material: Material,
  compact: boolean,
  geometries: BufferGeometry[],
): Group {
  const feather = new Group();
  const detail = compact ? 12 : 22;
  const vane = createFeatherGeometry(length, width, 0.038, 0.16, detail, 18, 0.18);
  const vaneMesh = new Mesh(vane, material);
  geometries.push(vane);
  feather.add(vaneMesh);

  const shaftGeo = new CylinderGeometry(0.016, 0.0045, length * 0.96, 7);
  shaftGeo.rotateZ(-Math.PI / 2);
  geometries.push(shaftGeo);
  const shaft = new Mesh(shaftGeo, material);
  shaft.position.set(length * 0.46, 0.012, 0);
  feather.add(shaft);

  const tipGeo = new ConeGeometry(0.018, length * 0.12, 7);
  tipGeo.rotateZ(-Math.PI / 2);
  geometries.push(tipGeo);
  const tip = new Mesh(tipGeo, material);
  tip.position.set(length * 0.97, 0.01, 0);
  feather.add(tip);

  const barbCount = compact ? 9 : 14;
  for (let i = 0; i < barbCount; i += 1) {
    const t = 0.14 + (i / (barbCount - 1)) * 0.74;
    const remaining = 1 - t;
    const barbLen = (0.22 + remaining * 0.42) * width * 2.4;
    const geo = createFeatherGeometry(barbLen, width * 0.12, 0.01, 0.02, 8, 0, 0);
    geometries.push(geo);
    for (const side of [-1, 1] as const) {
      const barb = new Mesh(geo, material);
      barb.position.set(t * length, 0.006, side * 0.012);
      barb.rotation.set(0.04 * side, side * (0.52 + t * 0.18), side * 0.08);
      feather.add(barb);
    }
  }

  rememberRest(feather);
  return feather;
}

export function createPhoenixRig(compact: boolean, options: PhoenixRigOptions = {}): PhoenixRig {
  const silhouette = Boolean(options.silhouette);
  const portrait = Boolean(options.portrait);
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const feathers: Object3D[] = [];

  const matte = new MeshBasicMaterial({ color: 0xf4f4f4 });
  const shell = silhouette
    ? matte
    : createGlassMaterial({
        tint: 0x2c2722,
        rim: 0xe6cfa5,
        absorb: 0x0a0808,
        opacity: 0.11,
        iri: 0.05,
        gain: 0.82,
      });
  const edge = silhouette
    ? matte
    : createGlassMaterial({
        tint: 0x4a3d30,
        rim: 0xf0d8b0,
        absorb: 0x120e0c,
        opacity: 0.18,
        iri: 0.04,
        gain: 0.96,
      });
  const dark = silhouette
    ? matte
    : createGlassMaterial({
        tint: 0x1a1614,
        rim: 0xc4b49a,
        absorb: 0x070606,
        opacity: 0.08,
        iri: 0.03,
        gain: 0.72,
      });
  const core = silhouette
    ? matte
    : new MeshStandardMaterial({
        color: 0x151210,
        roughness: 0.42,
        metalness: 0.22,
      });
  const eyeMat = silhouette
    ? matte
    : new MeshStandardMaterial({ color: 0x1a1210, roughness: 0.22, metalness: 0.28 });
  materials.push(matte);
  if (!silhouette) materials.push(shell, edge, dark, core, eyeMat);
  else materials.push(eyeMat);

  const root = new Group();
  const body = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const tail = new Group();
  root.add(body, leftWing, rightWing, tail);

  const fuseGeo = createFuselage(compact ? 16 : 24, compact ? 10 : 14);
  addMesh(body, fuseGeo, shell, geometries, 0, 0, 0, 0, 0, 0);
  if (!silhouette) {
    const inner = new Mesh(fuseGeo, core);
    inner.scale.setScalar(0.4);
    body.add(inner);
  }

  const skullGeo = createSkull(compact ? 10 : 14, 10);
  addMesh(body, skullGeo, edge, geometries, 0.012, 0.44, -1.38, -0.18, 0.08, 0.04);

  const beakUpperGeo = new ConeGeometry(0.042, 0.32, 8);
  addMesh(body, beakUpperGeo, edge, geometries, 0.0, 0.4, -1.72, -1.22, 0.08, 0);
  const beakLowerGeo = new ConeGeometry(0.028, 0.2, 7);
  addMesh(body, beakLowerGeo, dark, geometries, 0.0, 0.32, -1.68, -1.05, 0.08, 0);

  const eyeGeo = new SphereGeometry(0.028, 8, 6);
  geometries.push(eyeGeo);
  for (const side of [-1, 1] as const) {
    const eye = new Mesh(eyeGeo, eyeMat);
    eye.position.set(side * 0.078, 0.5, -1.42);
    body.add(eye);
  }

  const detail = compact ? 10 : 16;
  const crest = portrait ? 4 : 5;
  for (let i = 0; i < crest; i += 1) {
    const t = i / Math.max(crest - 1, 1);
    const geo = createFeatherGeometry(0.42 + t * 0.5, 0.1 + (1 - t) * 0.05, 0.018, 0.1, detail, 5, 0.12);
    const mesh = addMesh(
      body,
      geo,
      t > 0.55 ? edge : shell,
      geometries,
      (t - 0.42) * 0.1 + 0.03,
      0.62 + t * 0.04,
      -1.28 - t * 0.04,
      -0.55 - t * 0.18,
      (t - 0.45) * 0.22,
      Math.PI * 0.42 + (t - 0.5) * 0.16,
    );
    feathers.push(mesh);
  }

  const armGeo = new CylinderGeometry(0.032, 0.016, portrait ? 0.72 : 0.92, 6);
  armGeo.rotateZ(-Math.PI / 2);
  geometries.push(armGeo);

  function placeWing(wing: Group, side: number, spanScale: number, dihedral: number): Mesh {
    wing.position.set(side * 0.14, 0.18, -0.12);
    wing.rotation.set(0.08, side * 0.18, side * dihedral);
    const arm = new Mesh(armGeo, edge);
    arm.position.set(side * 0.32, 0.02, 0.06);
    wing.add(arm);

    const padSpan = (portrait ? 0.95 : 1.15) * spanScale;
    const pad = createWingPad(padSpan, portrait ? 0.72 : 0.88, 0.09);
    const padMesh = new Mesh(pad, shell);
    padMesh.rotation.y = side > 0 ? 0.12 : Math.PI - 0.12;
    geometries.push(pad);
    rememberRest(padMesh);
    wing.add(padMesh);

    const primaryLens = portrait
      ? [0.92, 1.12, 1.32, 1.48, 1.28]
      : [1.05, 1.28, 1.55, 1.82, 2.02, 1.78];
    let last: Mesh | null = null;
    for (let i = 0; i < primaryLens.length; i += 1) {
      const t = i / Math.max(primaryLens.length - 1, 1);
      const slot = t * 0.38;
      const len = primaryLens[i]! * spanScale;
      const geo = createFeatherGeometry(len, lerp(0.42, 0.18, t), 0.055, 0.14 + t * 0.05, detail, 8, side * 0.12);
      const mesh = addMesh(
        wing,
        geo,
        t > 0.7 ? edge : t < 0.2 ? dark : shell,
        geometries,
        side * (0.42 + t * 0.52),
        0.05 + Math.sin(t * Math.PI) * 0.08,
        0.22 + t * 0.38 + slot * 0.08,
        0.04,
        yawFor(side, 0.42 + t * 0.7 + slot * 0.35),
        side * (-0.04 - t * 0.05),
      );
      feathers.push(mesh);
      last = mesh;
    }
    return last!;
  }

  const leftDihedral = portrait ? 0.82 : 0.38;
  const rightDihedral = portrait ? 0.92 : 0.46;
  placeWing(leftWing, -1, portrait ? 0.9 : 0.94, leftDihedral);
  const rightTip = placeWing(rightWing, 1, portrait ? 0.98 : 1.05, rightDihedral);
  rememberRest(leftWing);
  rememberRest(rightWing);
  rememberRest(tail);
  rememberRest(body);

  const tailLens = portrait
    ? [1.45, 1.85, 2.25, 2.55, 2.2, 1.7]
    : [1.55, 1.95, 2.4, 2.85, 3.15, 2.7, 2.15, 1.65];
  for (let i = 0; i < tailLens.length; i += 1) {
    const t = i / Math.max(tailLens.length - 1, 1);
    const geo = createFeatherGeometry(
      tailLens[i]!,
      0.22 + (1 - Math.abs(t - 0.52)) * 0.1,
      0.04,
      0.18 + t * 0.1,
      detail,
      8,
      (t - 0.5) * 0.1,
    );
    const mesh = addMesh(
      tail,
      geo,
      i % 3 === 1 ? edge : i % 3 === 2 ? dark : shell,
      geometries,
      (t - 0.5) * 0.22 + 0.03,
      -0.12 - t * 0.14,
      1.02,
      0.18 + t * 0.12,
      -Math.PI * 0.5 + (t - 0.5) * 0.22,
      (t - 0.45) * 0.08,
    );
    feathers.push(mesh);
  }

  const detached = createHeroFeather(portrait ? 1.52 : 2.02, portrait ? 0.36 : 0.44, edge, compact, geometries);
  detached.position.copy(rightTip.position);
  detached.rotation.copy(rightTip.rotation);
  rightTip.visible = false;
  rememberRest(detached);
  rightWing.add(detached);
  feathers.push(detached);

  root.scale.setScalar(portrait ? 1.22 : compact ? 1.12 : 1.32);
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
