let cached: boolean | null = null;

export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined') {
    cached = false;
    return cached;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    cached = gl !== null;
    return cached;
  } catch {
    cached = false;
    return cached;
  }
}
