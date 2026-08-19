import { useAssetObjectUrl } from '../../features/assets/useAssetObjectUrl';
import { findProjectAsset } from '../../features/preview/previewData';
import type { AssetFile, Project } from '../../types/project';

export function useRendererAsset(
  project: Project,
  assetId: string | null,
): { asset: AssetFile | null; url: string | null } {
  const asset = findProjectAsset(project, assetId);
  const url = useAssetObjectUrl(asset?.blobKey ?? null);
  return { asset, url };
}
