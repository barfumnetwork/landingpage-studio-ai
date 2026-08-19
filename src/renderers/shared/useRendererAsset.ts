import { findProjectAsset } from '../../features/preview/previewData';
import { useResolvedAssetUrl } from '../../export/useResolvedAssetUrl';
import type { AssetFile, Project } from '../../types/project';

export function useRendererAsset(
  project: Project,
  assetId: string | null,
): { asset: AssetFile | null; url: string | null } {
  const asset = findProjectAsset(project, assetId);
  const url = useResolvedAssetUrl(asset?.blobKey ?? null);
  return { asset, url };
}
