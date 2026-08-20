import {
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  type Material,
} from 'three';

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
  curl: number,
): BufferGeometry {
  const geo = new PlaneGeometry(width, length, 6, 20);
  const pos = geo.attributes.position;
  if (!pos) return geo;
  const halfW = width * 0.5;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (y + length * 0.5) / Math.max(length, 0.0001);
    const envelope = Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.04))) ** 0.7;
    const vane = envelope * (0.22 + 0.78 * (1 - Math.abs(x) / (halfW + 0.0001) * 0.12));
    const ridge = Math.max(0, 1 - Math.abs(x) / (halfW * 0.2)) * 0.02;
    const camber = Math.sin(t * Math.PI) * curl;
    pos.setX(i, x * vane);
    pos.setZ(i, camber + ridge - (x * x * 3.6) / Math.max(width, 0.02));
  }
  geo.computeVertexNormals();
  return geo;
}

function glassShell(compact: boolean): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    color: 0xe7eef4,
    metalness: 0.05,
    roughness: compact ? 0.22 : 0.13,
    transmission: compact ? 0 : 0.56,
    thickness: compact ? 0.08 : 0.24,
    ior: 1.48,
    transparent: true,
    opacity: compact ? 0.4 : 0.9,
    envMapIntensity: compact ? 0.9 : 1.4,
    attenuationColor: 0xcbb48a,
    attenuationDistance: 1.65,
    specularIntensity: 1,
    specularColor: 0xfff4e4,
    clearcoat: compact ? 0.15 : 0.42,
    clearcoatRoughness: 0.2,
    side: DoubleSide,
    depthWrite: compact,
  });
}

function glassCore(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: 0x231c28,
    roughness: 0.46,
    metalness: 0.22,
    envMapIntensity: 0.55,
  });
}

function rimGlass(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: 0xe8d7b4,
    roughness: 0.18,
    metalness: 0.28,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: 0.42,
    side: DoubleSide,
    depthWrite: false,
  });
}

export function createPhoenixRig(compact: boolean): PhoenixRig {
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const feathers: Mesh[] = [];
  const outer = glassShell(compact);
  const inner = glassCore();
  const rim = rimGlass();
  materials.push(outer, inner, rim);

  const root = new Group();
  const body = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const tail = new Group();
  root.add(body, leftWing, rightWing, tail);

  const coreGeo = new SphereGeometry(0.42, compact ? 16 : 24, compact ? 12 : 18);
  geometries.push(coreGeo);
  const core = new Mesh(coreGeo, inner);
  core.scale.set(0.72, 1.35, 0.62);
  body.add(core);

  const chestGeo = new SphereGeometry(0.38, compact ? 14 : 20, compact ? 10 : 16);
  geometries.push(chestGeo);
  const chest = new Mesh(chestGeo, outer);
  chest.scale.set(0.95, 1.55, 0.82);
  chest.position.set(0, 0.06, 0.04);
  body.add(chest);

  const neckGeo = new SphereGeometry(0.16, 12, 10);
  geometries.push(neckGeo);
  const neck = new Mesh(neckGeo, outer);
  neck.scale.set(0.7, 1.8, 0.7);
  neck.position.set(0, 0.82, 0.18);
  neck.rotation.x = 0.35;
  body.add(neck);

  const headGeo = new SphereGeometry(0.14, 14, 12);
  geometries.push(headGeo);
  const head = new Mesh(headGeo, outer);
  head.scale.set(0.85, 0.7, 1.15);
  head.position.set(0, 1.18, 0.42);
  body.add(head);
  const beak = new Mesh(headGeo, rim);
  beak.scale.set(0.28, 0.18, 0.7);
  beak.position.set(0, 1.14, 0.62);
  body.add(beak);

  const crestCount = compact ? 3 : 5;
  for (let i = 0; i < crestCount; i += 1) {
    const geo = createFeatherGeometry(0.38 + i * 0.05, 0.08, 0.05);
    geometries.push(geo);
    const mesh = new Mesh(geo, i % 2 === 0 ? outer : rim);
    mesh.position.set((i - (crestCount - 1) * 0.5) * 0.05, 1.32 + i * 0.02, 0.28);
    mesh.rotation.set(-0.7, 0, (i - 2) * 0.12);
    body.add(mesh);
    feathers.push(mesh);
  }

  const perWing = compact ? 8 : 16;
  function placeWing(wing: Group, side: number): void {
    wing.position.set(side * 0.28, 0.28, 0.02);
    for (let i = 0; i < perWing; i += 1) {
      const t = i / (perWing - 1);
      const len = 1.15 + t * (compact ? 1.55 : 2.35);
      const wid = 0.18 + (1 - t) * 0.22;
      const geo = createFeatherGeometry(len, wid, 0.08 + t * 0.1);
      geometries.push(geo);
      const mesh = new Mesh(geo, t > 0.72 ? rim : outer);
      const spread = 0.35 + t * (compact ? 1.55 : 2.15);
      mesh.position.set(side * spread, Math.sin(t * Math.PI) * 0.22 - t * 0.12, -t * 0.18);
      mesh.rotation.set(
        -0.18 - t * 0.22,
        side * (0.15 + t * 0.35),
        side * (0.55 + t * 0.7),
      );
      mesh.rotation.z += (det(i, side + 2) - 0.5) * 0.06;
      wing.add(mesh);
      feathers.push(mesh);
      if (!compact && t > 0.2 && t < 0.85) {
        const under = createFeatherGeometry(len * 0.72, wid * 0.7, 0.12);
        geometries.push(under);
        const layer = new Mesh(under, rim);
        layer.position.copy(mesh.position);
        layer.position.y -= 0.04;
        layer.position.z -= 0.03;
        layer.rotation.copy(mesh.rotation);
        wing.add(layer);
        feathers.push(layer);
      }
    }
  }
  placeWing(leftWing, -1);
  placeWing(rightWing, 1);

  const tailCount = compact ? 6 : 11;
  for (let i = 0; i < tailCount; i += 1) {
    const t = i / (tailCount - 1);
    const geo = createFeatherGeometry(1.1 + t * 1.4, 0.14 + (1 - t) * 0.08, 0.16);
    geometries.push(geo);
    const mesh = new Mesh(geo, i === tailCount - 2 ? rim : outer);
    mesh.position.set((t - 0.5) * 0.55, -0.85 - t * 0.55, -0.35 - t * 0.7);
    mesh.rotation.set(0.85 + t * 0.35, (t - 0.5) * 0.4, (t - 0.5) * 0.25);
    tail.add(mesh);
    feathers.push(mesh);
  }

  const detachGeo = createFeatherGeometry(compact ? 1.15 : 1.55, 0.22, 0.14);
  geometries.push(detachGeo);
  const detached = new Mesh(detachGeo, outer);
  detached.position.set(0.12, -0.92, -0.42);
  detached.rotation.set(0.9, 0.18, 0.12);
  tail.add(detached);
  feathers.push(detached);

  root.scale.setScalar(compact ? 0.72 : 1);
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
