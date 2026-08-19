import { useEffect, useState } from 'react';
import { isAssetDbAvailable } from '../../utils/assetDb';

export function useAssetDbAvailable(): boolean {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    void isAssetDbAvailable().then(setOk);
  }, []);

  return ok;
}
