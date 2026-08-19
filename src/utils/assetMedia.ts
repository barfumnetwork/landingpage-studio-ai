import type { AssetFile, AssetKind } from '../types/project';

export const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

export type AssetRejectReason = 'unsupported' | 'too-large' | 'read' | 'quota';

export interface AssetReject {
  name: string;
  reason: AssetRejectReason;
}

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const LOGO_MIMES = new Set([...IMAGE_MIMES, 'image/svg+xml']);
const VIDEO_MIMES = new Set(['video/mp4', 'video/webm']);

const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

export function createBlobKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `blob_${crypto.randomUUID()}`;
  }
  return `blob_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveMime(file: File, allowed: Set<string>): string | null {
  const type = file.type.toLowerCase();
  if (allowed.has(type)) return type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  const mapped = EXT_MIME[ext];
  if (mapped && allowed.has(mapped)) return mapped;
  return null;
}

export function mimeForImages(file: File): string | null {
  return resolveMime(file, IMAGE_MIMES);
}

export function mimeForLogo(file: File): string | null {
  return resolveMime(file, LOGO_MIMES);
}

export function mimeForVideos(file: File): string | null {
  return resolveMime(file, VIDEO_MIMES);
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const rest = x % y;
    x = y;
    y = rest;
  }
  return x || 1;
}

export function formatAspect(width: number, height: number): string {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDimensions(
  width: number | null,
  height: number | null,
): string | null {
  if (width === null || height === null || width <= 0 || height <= 0) return null;
  return `${width} × ${height}`;
}

function aspectFromSize(width: number | null, height: number | null): number | null {
  if (width === null || height === null || height === 0) return null;
  return width / height;
}

export function reindexAssets(
  prefix: 'IMAGE' | 'VIDEO',
  items: AssetFile[],
): AssetFile[] {
  return items.map((item, index) => ({
    ...item,
    id: `${prefix}_${String(index + 1).padStart(2, '0')}`,
  }));
}

export function collectBlobKeysFromAssets(files: Array<AssetFile | null>): string[] {
  return files
    .filter((item): item is AssetFile => item !== null)
    .map((item) => item.blobKey);
}

async function readImageSize(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  if (typeof createImageBitmap === 'function' && file.type !== 'image/svg+xml') {
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      if (width > 0 && height > 0) return { width, height };
    } catch {
      // Fallback below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number | null; height: number | null }>(
      (resolve) => {
        const image = new Image();
        image.onload = () => {
          resolve({
            width: image.naturalWidth || null,
            height: image.naturalHeight || null,
          });
        };
        image.onerror = () => resolve({ width: null, height: null });
        image.src = url;
      },
    );
    return size;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function readVideoSize(
  file: File,
): Promise<{ width: number | null; height: number | null }> {
  const url = URL.createObjectURL(file);
  try {
    const size = await new Promise<{ width: number | null; height: number | null }>(
      (resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const finish = (width: number | null, height: number | null) => {
          video.removeAttribute('src');
          video.load();
          resolve({ width, height });
        };
        video.onloadedmetadata = () => {
          finish(video.videoWidth || null, video.videoHeight || null);
        };
        video.onerror = () => finish(null, null);
        video.src = url;
      },
    );
    return size;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function buildImageAsset(
  file: File,
  mime: string,
  kind: AssetKind,
): Promise<AssetFile> {
  const { width, height } = await readImageSize(file);
  return {
    id: 'pending',
    kind,
    mime,
    name: file.name,
    size: file.size,
    width,
    height,
    aspect: aspectFromSize(width, height),
    blobKey: createBlobKey(),
  };
}

export async function buildVideoAsset(file: File, mime: string): Promise<AssetFile> {
  const { width, height } = await readVideoSize(file);
  return {
    id: 'pending',
    kind: 'video',
    mime,
    name: file.name,
    size: file.size,
    width,
    height,
    aspect: aspectFromSize(width, height),
    blobKey: createBlobKey(),
  };
}

export function logoKindFromMime(mime: string): AssetKind {
  return mime === 'image/svg+xml' ? 'svg' : 'logo';
}

export function transparentFileName(originalName: string): string {
  const trimmed = originalName.trim() || 'logo';
  const base = trimmed.replace(/\.[^.]+$/, '') || 'logo';
  return `${base}-transparent.png`;
}

export function formatMimeShort(mime: string): string {
  if (mime === 'image/png') return 'PNG';
  if (mime === 'image/jpeg') return 'JPG';
  if (mime === 'image/webp') return 'WEBP';
  if (mime === 'image/svg+xml') return 'SVG';
  return mime;
}

export function formatLogoMeta(asset: AssetFile): string {
  const parts = [formatMimeShort(asset.mime)];
  const dimensions = formatDimensions(asset.width, asset.height);
  if (dimensions) parts.push(dimensions);
  parts.push(formatBytes(asset.size));
  return parts.join(' · ');
}
