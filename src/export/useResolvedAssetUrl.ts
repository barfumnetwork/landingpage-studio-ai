import { useContext } from 'react';
import { useAssetObjectUrl } from '../features/assets/useAssetObjectUrl';
import { AssetSourceContext } from './assetSource';

export function useResolvedAssetUrl(blobKey: string | null): string | null {
  const source = useContext(AssetSourceContext);
  const idbUrl = useAssetObjectUrl(source.mode === 'indexeddb' ? blobKey : null);
  if (!blobKey) return null;
  if (source.mode === 'static') return source.urls[blobKey] ?? null;
  return idbUrl;
}
