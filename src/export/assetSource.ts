import { createContext } from 'react';

export type AssetSourceMode = 'indexeddb' | 'static';

export interface AssetSourceValue {
  mode: AssetSourceMode;
  urls: Record<string, string>;
}

export const DEFAULT_ASSET_SOURCE: AssetSourceValue = {
  mode: 'indexeddb',
  urls: {},
};

export const AssetSourceContext = createContext<AssetSourceValue>(DEFAULT_ASSET_SOURCE);
