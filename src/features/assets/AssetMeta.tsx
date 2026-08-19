import type { AssetFile } from '../../types/project';
import { formatAspect, formatBytes, formatDimensions } from '../../utils/assetMedia';
import styles from './assets.module.css';

interface AssetMetaProps {
  asset: AssetFile;
}

export function AssetMeta({ asset }: AssetMetaProps) {
  const dimensions = formatDimensions(asset.width, asset.height);
  const aspect =
    asset.width && asset.height ? formatAspect(asset.width, asset.height) : null;

  return (
    <div className={styles.meta}>
      <p className={styles.metaName}>{asset.name}</p>
      {dimensions ? <p>{dimensions}</p> : null}
      {aspect ? <p>{aspect}</p> : null}
      <p>{formatBytes(asset.size)}</p>
    </div>
  );
}
