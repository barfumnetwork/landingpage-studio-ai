import { type ReactNode } from 'react';
import { AssetSourceContext, type AssetSourceValue } from './assetSource';

export function AssetSourceProvider({
  value,
  children,
}: {
  value: AssetSourceValue;
  children: ReactNode;
}) {
  return (
    <AssetSourceContext.Provider value={value}>{children}</AssetSourceContext.Provider>
  );
}
