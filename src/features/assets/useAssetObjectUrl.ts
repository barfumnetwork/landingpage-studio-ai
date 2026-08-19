import { useEffect, useState } from 'react';
import { getAssetBlob } from '../../utils/assetDb';
import { releaseObjectUrl, retainObjectUrl } from '../../utils/objectUrls';

export function useAssetObjectUrl(blobKey: string | null): string | null {
  const [cached, setCached] = useState<{ key: string; url: string } | null>(null);

  useEffect(() => {
    if (!blobKey) return;

    let cancelled = false;
    let retained = false;

    void getAssetBlob(blobKey).then((blob) => {
      if (cancelled) return;
      if (!blob) return;
      const objectUrl = retainObjectUrl(blobKey, blob);
      retained = true;
      setCached({ key: blobKey, url: objectUrl });
    });

    return () => {
      cancelled = true;
      if (retained) releaseObjectUrl(blobKey);
    };
  }, [blobKey]);

  if (!blobKey) return null;
  if (cached?.key !== blobKey) return null;
  return cached.url;
}
