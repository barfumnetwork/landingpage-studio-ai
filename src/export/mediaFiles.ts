import type { AssetFile } from '../types/project';

const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

export function extensionForMime(mime: string): string {
  return MIME_EXT[mime] ?? 'bin';
}

export function mediaFileName(asset: AssetFile): string {
  return `${asset.blobKey}.${extensionForMime(asset.mime)}`;
}

export function mediaHref(asset: AssetFile): string {
  return `./media/${mediaFileName(asset)}`;
}
