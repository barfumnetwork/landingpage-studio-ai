import { collectProjectBlobKeys } from '../store/collectBlobKeys';
import type { AssetFile, Project } from '../types/project';
import { getAssetBlob } from '../utils/assetDb';
import { mediaFileName, mediaHref } from './mediaFiles';

function assetsOf(project: Project): AssetFile[] {
  return [
    project.logo.original,
    project.logo.transparent,
    ...project.media.images,
    ...project.media.videos,
  ].filter((item): item is AssetFile => item !== null);
}

export interface CollectedMedia {
  urls: Record<string, string>;
  files: Array<{ path: string; blob: Blob }>;
}

export async function collectExportMedia(project: Project): Promise<CollectedMedia> {
  const urls: Record<string, string> = {};
  const files: Array<{ path: string; blob: Blob }> = [];
  const keys = new Set(collectProjectBlobKeys(project));

  for (const asset of assetsOf(project)) {
    if (!keys.has(asset.blobKey)) continue;
    const blob = await getAssetBlob(asset.blobKey);
    if (!blob) continue;
    urls[asset.blobKey] = mediaHref(asset);
    files.push({ path: `media/${mediaFileName(asset)}`, blob });
  }

  return { urls, files };
}
