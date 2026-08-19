import type { AssetFile, LogoSelected } from '../types/project';
import {
  AssetDbError,
  deleteAssetBlob,
  deleteAssetBlobs,
  getAssetBlob,
  putAssetBlob,
} from '../utils/assetDb';
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  type AssetReject,
  buildImageAsset,
  buildVideoAsset,
  logoKindFromMime,
  mimeForImages,
  mimeForLogo,
  mimeForVideos,
  reindexAssets,
} from '../utils/assetMedia';
import { revokeObjectUrlNow, revokeObjectUrls } from '../utils/objectUrls';
import { invalidateLogoKnockout, startLogoKnockout } from '../utils/logoKnockout';
import { useProjectStore } from './projectStore';

function persistAssets(): void {
  useProjectStore.getState().flushPersist();
}

function quotaOrRead(error: unknown): AssetReject['reason'] {
  if (error instanceof AssetDbError && error.code === 'quota') return 'quota';
  if (error instanceof AssetDbError && error.code === 'unavailable') return 'quota';
  return 'read';
}

export async function addImageFiles(files: File[]): Promise<AssetReject[]> {
  const rejects: AssetReject[] = [];
  const added: AssetFile[] = [];

  for (const file of files) {
    const mime = mimeForImages(file);
    if (!mime) {
      rejects.push({ name: file.name, reason: 'unsupported' });
      continue;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      rejects.push({ name: file.name, reason: 'too-large' });
      continue;
    }
    try {
      const asset = await buildImageAsset(file, mime, 'image');
      await putAssetBlob(asset.blobKey, file);
      added.push(asset);
    } catch (error) {
      rejects.push({ name: file.name, reason: quotaOrRead(error) });
    }
  }

  if (added.length === 0) return rejects;

  const project = useProjectStore.getState().project;
  if (!project) return rejects;
  useProjectStore.getState().updateProject({
    media: { images: reindexAssets('IMAGE', [...project.media.images, ...added]) },
  });
  persistAssets();
  return rejects;
}

export async function addVideoFiles(files: File[]): Promise<AssetReject[]> {
  const rejects: AssetReject[] = [];
  const added: AssetFile[] = [];

  for (const file of files) {
    const mime = mimeForVideos(file);
    if (!mime) {
      rejects.push({ name: file.name, reason: 'unsupported' });
      continue;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      rejects.push({ name: file.name, reason: 'too-large' });
      continue;
    }
    try {
      const asset = await buildVideoAsset(file, mime);
      await putAssetBlob(asset.blobKey, file);
      added.push(asset);
    } catch (error) {
      rejects.push({ name: file.name, reason: quotaOrRead(error) });
    }
  }

  if (added.length === 0) return rejects;

  const project = useProjectStore.getState().project;
  if (!project) return rejects;
  useProjectStore.getState().updateProject({
    media: { videos: reindexAssets('VIDEO', [...project.media.videos, ...added]) },
  });
  persistAssets();
  return rejects;
}

export async function addLogoFile(
  file: File,
  slot: 'original' | 'transparent',
): Promise<AssetReject | null> {
  const mime = mimeForLogo(file);
  if (!mime) return { name: file.name, reason: 'unsupported' };
  if (slot === 'transparent' && mime !== 'image/png') {
    return { name: file.name, reason: 'unsupported' };
  }
  if (file.size > IMAGE_MAX_BYTES) return { name: file.name, reason: 'too-large' };

  try {
    const kind = slot === 'original' ? logoKindFromMime(mime) : 'logo';
    const asset = await buildImageAsset(file, mime, kind);
    asset.id = slot === 'original' ? 'LOGO_ORIGINAL' : 'LOGO_TRANSPARENT';
    await putAssetBlob(asset.blobKey, file);

    const project = useProjectStore.getState().project;
    if (!project) {
      void deleteAssetBlob(asset.blobKey);
      return { name: file.name, reason: 'read' };
    }
    if (slot === 'transparent' && !project.logo.original) {
      void deleteAssetBlob(asset.blobKey);
      return { name: file.name, reason: 'unsupported' };
    }

    if (slot === 'original') {
      invalidateLogoKnockout();
      const stored = await getAssetBlob(asset.blobKey);
      if (!stored) {
        void deleteAssetBlob(asset.blobKey);
        return { name: file.name, reason: 'read' };
      }
      const stale = [project.logo.original, project.logo.transparent]
        .filter((item): item is AssetFile => item !== null)
        .map((item) => item.blobKey)
        .filter((key) => key !== asset.blobKey);
      const raster = kind !== 'svg';
      useProjectStore.getState().updateProject({
        logo: {
          original: asset,
          transparent: null,
          selected: 'original',
          status: raster ? 'processing' : 'ready',
        },
      });
      persistAssets();
      revokeObjectUrls(stale);
      void deleteAssetBlobs(stale);
      if (raster) startLogoKnockout(asset.blobKey);
    } else {
      if (project.logo.transparent) {
        revokeObjectUrlNow(project.logo.transparent.blobKey);
        void deleteAssetBlob(project.logo.transparent.blobKey);
      }
      useProjectStore.getState().updateProject({
        logo: {
          transparent: asset,
          selected: 'transparent',
          status: 'ready',
        },
      });
    }
    persistAssets();
    return null;
  } catch (error) {
    return { name: file.name, reason: quotaOrRead(error) };
  }
}

export function reorderImages(fromIndex: number, toIndex: number): void {
  const project = useProjectStore.getState().project;
  if (!project) return;
  if (fromIndex === toIndex) return;
  const next = [...project.media.images];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.length ||
    toIndex >= next.length
  ) {
    return;
  }
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return;
  next.splice(toIndex, 0, moved);
  useProjectStore.getState().updateProject({
    media: { images: reindexAssets('IMAGE', next) },
  });
  persistAssets();
}

export function moveImage(id: string, direction: -1 | 1): void {
  const project = useProjectStore.getState().project;
  if (!project) return;
  const fromIndex = project.media.images.findIndex((item) => item.id === id);
  if (fromIndex < 0) return;
  reorderImages(fromIndex, fromIndex + direction);
}

export async function removeImage(
  id: string,
): Promise<{ asset: AssetFile; blob: Blob; index: number } | null> {
  const project = useProjectStore.getState().project;
  if (!project) return null;
  const index = project.media.images.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const removed = project.media.images[index];
  if (!removed) return null;
  let blob: Blob | null = null;
  try {
    blob = await getAssetBlob(removed.blobKey);
  } catch {
    blob = null;
  }
  const next = project.media.images.filter((item) => item.id !== id);
  useProjectStore.getState().updateProject({
    media: { images: reindexAssets('IMAGE', next) },
  });
  persistAssets();
  revokeObjectUrlNow(removed.blobKey);
  try {
    await deleteAssetBlob(removed.blobKey);
  } catch {
    // JSON already dropped the reference.
  }
  if (!blob) return null;
  return { asset: removed, blob, index };
}

export async function restoreImage(
  asset: AssetFile,
  blob: Blob,
  index: number,
): Promise<void> {
  try {
    await putAssetBlob(asset.blobKey, blob);
  } catch {
    return;
  }
  const project = useProjectStore.getState().project;
  if (!project) return;
  const next = [...project.media.images];
  const insertAt = Math.min(Math.max(index, 0), next.length);
  next.splice(insertAt, 0, asset);
  useProjectStore.getState().updateProject({
    media: { images: reindexAssets('IMAGE', next) },
  });
  persistAssets();
}

export async function removeVideo(id: string): Promise<void> {
  const project = useProjectStore.getState().project;
  if (!project) return;
  const removed = project.media.videos.find((item) => item.id === id);
  if (!removed) return;
  const next = project.media.videos.filter((item) => item.id !== id);
  useProjectStore.getState().updateProject({
    media: { videos: reindexAssets('VIDEO', next) },
  });
  persistAssets();
  revokeObjectUrlNow(removed.blobKey);
  try {
    await deleteAssetBlob(removed.blobKey);
  } catch {
    // JSON already dropped the reference.
  }
}

export async function removeLogo(): Promise<void> {
  invalidateLogoKnockout();
  const project = useProjectStore.getState().project;
  if (!project) return;
  const keys = [project.logo.original, project.logo.transparent]
    .filter((item): item is AssetFile => item !== null)
    .map((item) => item.blobKey);
  useProjectStore.getState().updateProject({
    logo: {
      original: null,
      transparent: null,
      selected: 'original',
      status: 'idle',
    },
  });
  persistAssets();
  revokeObjectUrls(keys);
  try {
    await deleteAssetBlobs(keys);
  } catch {
    // JSON already dropped the reference.
  }
}

export function selectLogoVariant(selected: LogoSelected): void {
  const project = useProjectStore.getState().project;
  if (!project) return;
  if (selected === 'transparent' && !project.logo.transparent) return;
  useProjectStore.getState().updateProject({ logo: { selected } });
  persistAssets();
}

export function retryLogoKnockout(): void {
  const project = useProjectStore.getState().project;
  const original = project?.logo.original;
  if (!original || original.kind === 'svg') return;
  useProjectStore.getState().updateProject({
    logo: { status: 'processing', selected: 'original' },
  });
  persistAssets();
  startLogoKnockout(original.blobKey);
}
