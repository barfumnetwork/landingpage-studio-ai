import {
  ACESFilmicToneMapping,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  NoToneMapping,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
  type WebGLRenderTarget,
} from 'three';

export type ToneMappingMode = 'aces' | 'none';

export interface Disposable {
  dispose: () => void;
}

export interface RendererRuntimeOptions {
  node: HTMLDivElement;
  fallbackClass: string;
  antialias: boolean;
  alpha: boolean;
  depth?: boolean;
  desktopDpr?: number;
  mobileDpr?: number;
  compact?: boolean;
  toneMapping?: ToneMappingMode;
}

export interface RendererSize {
  width: number;
  height: number;
  dpr: number;
}

export interface RendererRuntime {
  renderer: WebGLRenderer;
  isRunning: () => boolean;
  resize: () => RendererSize;
  track: (resource: Disposable) => void;
  dispose: () => void;
}

function computeDpr(desktopCap: number, mobileCap: number, compact: boolean): number {
  if (compact) return 1;
  const mobile = window.matchMedia('(max-width: 720px)').matches;
  const cap = mobile ? mobileCap : desktopCap;
  const raw = window.devicePixelRatio || 1;
  if (raw === 1 && window.innerWidth > 2560) return 0.5;
  return Math.min(raw, cap);
}

export function isFinePointer(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

export function isDesktopPointer(): boolean {
  return isFinePointer() && window.matchMedia('(min-width: 1024px)').matches;
}

export function createRendererRuntime(
  options: RendererRuntimeOptions,
): RendererRuntime | null {
  const {
    node,
    fallbackClass,
    antialias,
    alpha,
    depth = true,
    desktopDpr = 1.5,
    mobileDpr = 1.15,
    compact = false,
    toneMapping = 'none',
  } = options;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      antialias,
      alpha,
      depth,
      stencil: false,
      powerPreference: 'high-performance',
    });
  } catch {
    node.classList.add(fallbackClass);
    return null;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = toneMapping === 'aces' ? ACESFilmicToneMapping : NoToneMapping;
  if (toneMapping === 'aces') renderer.toneMappingExposure = 1.16;
  renderer.shadowMap.enabled = false;
  node.appendChild(renderer.domElement);

  const tracked: Disposable[] = [];
  let running = true;
  const observers: Array<{ disconnect: () => void }> = [];

  function resize(): RendererSize {
    const width = node.clientWidth || 1;
    const height = node.clientHeight || 1;
    const dpr = computeDpr(desktopDpr, mobileDpr, compact);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    return { width, height, dpr };
  }

  const sizeObserver = new ResizeObserver(() => {
    resize();
  });
  sizeObserver.observe(node);
  observers.push(sizeObserver);

  if (!compact) {
    const vis = new IntersectionObserver(
      (entries) => {
        running = entries.some((entry) => entry.isIntersecting);
      },
      { threshold: 0.08 },
    );
    vis.observe(node);
    observers.push(vis);
  }

  function onHidden(): void {
    running = document.visibilityState === 'visible';
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    running = false;
    node.classList.add(fallbackClass);
  }

  document.addEventListener('visibilitychange', onHidden);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  resize();

  return {
    renderer,
    isRunning: () => running,
    resize,
    track(resource) {
      tracked.push(resource);
    },
    dispose() {
      running = false;
      observers.forEach((item) => item.disconnect());
      document.removeEventListener('visibilitychange', onHidden);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      tracked.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export function createStudioEnvironment(renderer: WebGLRenderer): {
  texture: Texture;
  dispose: () => void;
} {
  const envScene = new Scene();
  envScene.background = new Color(0x1a1612);

  const geo = new PlaneGeometry(12, 12);
  const slitGeo = new PlaneGeometry(1.1, 16);
  const key = new Mesh(
    geo,
    new MeshBasicMaterial({ color: 0xc4893c, side: DoubleSide }),
  );
  key.position.set(-2.4, 6.2, 3.2);
  key.rotation.x = Math.PI / 2;
  const fill = new Mesh(geo, new MeshBasicMaterial({ color: 0x7a8a92, side: DoubleSide }));
  fill.position.set(5.4, 1.2, 2.4);
  fill.rotation.y = -Math.PI / 2;
  const ground = new Mesh(
    geo,
    new MeshBasicMaterial({ color: 0x2a241c, side: DoubleSide }),
  );
  ground.position.set(0, -4.2, 0);
  ground.rotation.x = -Math.PI / 2;
  const slit = new Mesh(
    slitGeo,
    new MeshBasicMaterial({ color: 0xffc878, side: DoubleSide }),
  );
  slit.position.set(0.2, 2.8, 6.2);
  const slitB = new Mesh(
    slitGeo,
    new MeshBasicMaterial({ color: 0x8a6a4a, side: DoubleSide }),
  );
  slitB.position.set(-2.6, 2.4, 5.6);
  slitB.scale.set(0.32, 0.82, 1);
  const windowLite = new Mesh(
    geo,
    new MeshBasicMaterial({ color: 0x7a8a92, side: DoubleSide }),
  );
  windowLite.position.set(-6.4, 2.2, 0.4);
  windowLite.rotation.y = Math.PI / 2;
  const discGeo = new PlaneGeometry(2.6, 2.6);
  const disc = new Mesh(
    discGeo,
    new MeshBasicMaterial({ color: 0xe8c090, side: DoubleSide }),
  );
  disc.position.set(-1.1, 5.8, 4.6);
  disc.rotation.x = Math.PI / 2;
  envScene.add(key, fill, ground, slit, slitB, windowLite, disc);

  const pmrem = new PMREMGenerator(renderer);
  const target: WebGLRenderTarget = pmrem.fromScene(envScene, 0.028);
  geo.dispose();
  slitGeo.dispose();
  discGeo.dispose();
  key.material.dispose();
  fill.material.dispose();
  ground.material.dispose();
  slit.material.dispose();
  slitB.material.dispose();
  windowLite.material.dispose();
  disc.material.dispose();
  pmrem.dispose();

  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
