import {
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';

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
    rx: Math.max(0.004, catmull(p0.rx, p1.rx, p2.rx, p3.rx, u)),
    ry: Math.max(0.004, catmull(p0.ry, p1.ry, p2.ry, p3.ry, u)),
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
      TMP.copy(RIGHT)
        .multiplyScalar(Math.cos(a) * knot.rx)
        .addScaledVector(UP, Math.sin(a) * knot.ry);
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
      { x: 0, y: 0.06, z: 1.28, rx: 0.055, ry: 0.048 },
      { x: 0, y: 0.1, z: 0.92, rx: 0.09, ry: 0.08 },
      { x: 0, y: 0.14, z: 0.58, rx: 0.13, ry: 0.12 },
      { x: 0, y: 0.18, z: 0.22, rx: 0.16, ry: 0.15 },
      { x: 0, y: 0.22, z: -0.12, rx: 0.2, ry: 0.22 },
      { x: 0, y: 0.2, z: -0.42, rx: 0.17, ry: 0.19 },
      { x: 0, y: 0.28, z: -0.7, rx: 0.08, ry: 0.09 },
      { x: 0, y: 0.5, z: -0.92, rx: 0.05, ry: 0.055 },
      { x: 0, y: 0.62, z: -1.12, rx: 0.048, ry: 0.052 },
      { x: 0, y: 0.52, z: -1.32, rx: 0.07, ry: 0.068 },
      { x: 0, y: 0.56, z: -1.5, rx: 0.1, ry: 0.09 },
      { x: 0, y: 0.5, z: -1.68, rx: 0.062, ry: 0.055 },
      { x: 0, y: 0.44, z: -1.86, rx: 0.022, ry: 0.018 },
      { x: 0, y: 0.4, z: -2.02, rx: 0.006, ry: 0.005 },
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
  barbs = 7,
  twist = 0,
): BufferGeometry {
  const segments = Math.max(8, detail);
  const knots: SpineKnot[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const belly = Math.sin(Math.PI * Math.min(1, u * 1.05) ** 0.58) ** 0.5;
    const tip = u > 0.68 ? 1 - ((u - 0.68) / 0.32) ** 1.4 : 1;
    const env = Math.max(0.1, belly * Math.max(0.1, tip));
    const notch =
      barbs > 0 ? 1 - 0.1 * Math.abs(Math.sin(u * Math.PI * barbs)) * (u > 0.12 ? 1 : u / 0.12) : 1;
    knots.push({
      x: u ** 0.92 * length,
      y: Math.sin(u * Math.PI) * curl,
      z: 0,
      rx: Math.max(0.01, thickness * (0.85 + (1 - u) * 0.4)),
      ry: Math.max(0.02, width * 0.5 * env * notch),
    });
  }
  const geo = loftSpine(knots, segments, 8);
  if (twist !== 0) {
    const pos = geo.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const u = Math.min(1, Math.max(0, x / Math.max(length, 0.001)));
        const a = twist * u;
        pos.setY(i, y * Math.cos(a) - z * Math.sin(a));
        pos.setZ(i, y * Math.sin(a) + z * Math.cos(a));
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

function addFeather(
  parent: Object3D,
  mat: Material,
  geometries: BufferGeometry[],
  feathers: Object3D[],
  length: number,
  width: number,
  thick: number,
  curl: number,
  detail: number,
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
  twist = 0,
): Group {
  const group = new Group();
  group.position.set(x, y, z);
  group.rotation.set(rx, ry, rz);
  const vane = createFeatherGeometry(length, width, thick, curl, detail, 8, twist);
  geometries.push(vane);
  group.add(new Mesh(vane, mat));
  const shaftLen = length * 0.92;
  const shaft = new CylinderGeometry(thick * 0.55, thick * 0.18, shaftLen, 5);
  shaft.rotateZ(-Math.PI / 2);
  geometries.push(shaft);
  const shaftMesh = new Mesh(shaft, mat);
  shaftMesh.position.set(shaftLen * 0.46, thick * 0.2, 0);
  group.add(shaftMesh);
  const tip = new ConeGeometry(thick * 0.35, length * 0.1, 5);
  tip.rotateZ(-Math.PI / 2);
  geometries.push(tip);
  const tipMesh = new Mesh(tip, mat);
  tipMesh.position.set(length * 0.97, thick * 0.15, 0);
  group.add(tipMesh);
  rememberRest(group);
  parent.add(group);
  feathers.push(group);
  return group;
}

export function createPhoenixRig(compact: boolean, options: PhoenixRigOptions = {}): PhoenixRig {
  const portrait = Boolean(options.portrait);
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const feathers: Object3D[] = [];
  const matte = new MeshBasicMaterial({ color: 0xf4f4f4 });
  materials.push(matte);

  const root = new Group();
  const body = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const tail = new Group();
  root.add(body, leftWing, rightWing, tail);

  const fuseGeo = createFuselage(compact ? 18 : 26, compact ? 10 : 14);
  addMesh(body, fuseGeo, matte, geometries, 0, 0, 0, 0, 0, 0);

  const beakUpper = new ConeGeometry(0.048, 0.42, 8);
  addMesh(body, beakUpper, matte, geometries, 0, 0.42, -1.92, -1.38, 0.06, 0);
  const beakLower = new ConeGeometry(0.03, 0.24, 7);
  addMesh(body, beakLower, matte, geometries, 0, 0.34, -1.84, -1.12, 0.06, 0);

  const eyeGeo = new SphereGeometry(0.028, 8, 6);
  geometries.push(eyeGeo);
  for (const side of [-1, 1] as const) {
    const eye = new Mesh(eyeGeo, matte);
    eye.position.set(side * 0.072, 0.58, -1.48);
    body.add(eye);
  }

  const shoulderGeo = new SphereGeometry(0.16, 10, 8);
  geometries.push(shoulderGeo);
  for (const side of [-1, 1] as const) {
    const shoulder = new Mesh(shoulderGeo, matte);
    shoulder.position.set(side * 0.2, 0.26, -0.16);
    shoulder.scale.set(1.15, 0.85, 1.05);
    body.add(shoulder);
  }

  const rumpGeo = loftSpine(
    [
      { x: 0, y: 0.08, z: 0.55, rx: 0.12, ry: 0.1 },
      { x: 0, y: 0.02, z: 0.95, rx: 0.09, ry: 0.075 },
      { x: 0, y: -0.06, z: 1.32, rx: 0.055, ry: 0.045 },
      { x: 0, y: -0.12, z: 1.58, rx: 0.02, ry: 0.016 },
    ],
    10,
    8,
  );
  addMesh(body, rumpGeo, matte, geometries, 0, 0, 0, 0, 0, 0);

  const detail = compact ? 8 : 12;
  const crest = portrait ? 4 : 5;
  for (let i = 0; i < crest; i += 1) {
    const t = i / Math.max(crest - 1, 1);
    addFeather(
      body,
      matte,
      geometries,
      feathers,
      0.48 + t * 0.42,
      0.11 + (1 - t) * 0.05,
      0.024,
      0.1,
      detail,
      0.02 + (t - 0.5) * 0.06,
      0.68,
      -1.38 - t * 0.04,
      -1.12 - t * 0.16,
      (t - 0.45) * 0.14,
      0.04,
    );
  }

  function placeWing(wing: Group, side: number, span: number, dihedral: number): Group {
    wing.position.set(side * 0.18, 0.24, -0.14);
    wing.rotation.set(0.12, side * 0.22, side * dihedral);

    const coverts = portrait ? 3 : 4;
    for (let i = 0; i < coverts; i += 1) {
      const t = i / Math.max(coverts - 1, 1);
      addFeather(
        wing,
        matte,
        geometries,
        feathers,
        (0.42 + t * 0.28) * span,
        0.32,
        0.05,
        0.06,
        detail,
        side * (0.02 + t * 0.14),
        0.04,
        0.02 + t * 0.04,
        0.18,
        yawFor(side, 0.2 + t * 0.1),
        side * -0.04,
        side * 0.06,
      );
    }

    const secondaries = portrait ? 4 : 5;
    for (let i = 0; i < secondaries; i += 1) {
      const t = i / Math.max(secondaries - 1, 1);
      addFeather(
        wing,
        matte,
        geometries,
        feathers,
        (0.7 + t * 0.38) * span,
        0.34 - t * 0.04,
        0.048,
        0.08,
        detail,
        side * (0.12 + t * 0.22),
        0.05 + t * 0.03,
        0.08 + t * 0.1,
        0.1,
        yawFor(side, 0.28 + t * 0.18),
        side * (-0.05 - t * 0.02),
        side * 0.08,
      );
    }

    const primaryLens = portrait
      ? [0.95, 1.18, 1.38, 1.55, 1.42]
      : [1.08, 1.32, 1.58, 1.82, 2.02, 1.78];
    let last: Group | null = null;
    for (let i = 0; i < primaryLens.length; i += 1) {
      const t = i / Math.max(primaryLens.length - 1, 1);
      const slot = t * 0.28;
      last = addFeather(
        wing,
        matte,
        geometries,
        feathers,
        primaryLens[i]! * span,
        lerp(0.32, 0.16, t),
        0.042,
        0.12 + t * 0.04,
        detail,
        side * (0.32 + t * 0.48),
        0.06 + Math.sin(t * Math.PI) * 0.07,
        0.18 + t * 0.32 + slot * 0.06,
        0.05,
        yawFor(side, 0.38 + t * 0.62 + slot),
        side * (-0.04 - t * 0.05),
        side * 0.1,
      );
    }
    return last!;
  }

  const leftDihedral = portrait ? 0.78 : 0.52;
  const rightDihedral = portrait ? 0.86 : 0.6;
  placeWing(leftWing, -1, portrait ? 0.78 : 0.96, leftDihedral);
  const rightTip = placeWing(rightWing, 1, portrait ? 0.86 : 1.04, rightDihedral);

  const tailLens = portrait
    ? [1.35, 1.7, 2.05, 2.35, 2.15, 1.75, 1.4]
    : [1.45, 1.8, 2.2, 2.55, 2.85, 2.5, 2.1, 1.7, 1.35];
  for (let i = 0; i < tailLens.length; i += 1) {
    const t = i / Math.max(tailLens.length - 1, 1);
    addFeather(
      tail,
      matte,
      geometries,
      feathers,
      tailLens[i]!,
      0.22 + (1 - Math.abs(t - 0.5)) * 0.08,
      0.038,
      0.16 + t * 0.1,
      detail,
      (t - 0.5) * 0.16,
      -0.08 - t * 0.06,
      0.82,
      0.32 + t * 0.14,
      -Math.PI * 0.5 + (t - 0.5) * 0.2,
      (t - 0.5) * 0.05,
      (t - 0.5) * 0.06,
    );
  }

  const detached = addFeather(
    rightWing,
    matte,
    geometries,
    feathers,
    portrait ? 1.42 : 1.85,
    portrait ? 0.3 : 0.36,
    0.04,
    0.14,
    compact ? 10 : 16,
    rightTip.position.x,
    rightTip.position.y,
    rightTip.position.z,
    rightTip.rotation.x,
    rightTip.rotation.y,
    rightTip.rotation.z,
    0.12,
  );
  rightTip.visible = false;

  rememberRest(leftWing);
  rememberRest(rightWing);
  rememberRest(tail);
  rememberRest(body);

  root.scale.setScalar(portrait ? 1.16 : compact ? 1.08 : 1.24);
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
