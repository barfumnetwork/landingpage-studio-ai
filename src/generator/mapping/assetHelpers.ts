import type { AssetFile, AssetMapItem, ConceptId } from '../../types/project';

export function isLandscape(aspect: number | null): boolean {
  return aspect !== null && aspect >= 1.3;
}

export function isPortrait(aspect: number | null): boolean {
  return aspect !== null && aspect <= 0.85;
}

export function isWide(aspect: number | null): boolean {
  return aspect !== null && aspect >= 1.8;
}

export function pixelArea(asset: AssetFile): number {
  if (asset.width === null || asset.height === null) return 0;
  if (asset.width <= 0 || asset.height <= 0) return 0;
  return asset.width * asset.height;
}

export function findAsset(assets: AssetFile[], id: string | null): AssetFile | null {
  if (!id) return null;
  return assets.find((item) => item.id === id) ?? null;
}

export function unusedAssets(
  assets: AssetFile[],
  used: ReadonlySet<string>,
): AssetFile[] {
  return assets.filter((item) => !used.has(item.id));
}

export function mapItem(
  slot: string,
  assetId: string | null,
  required: boolean,
  recommendedRatio: string,
  recommendedPx: string,
  note: string,
): AssetMapItem {
  return { slot, assetId, required, recommendedRatio, recommendedPx, note };
}

export function heroRecommendation(
  conceptId: ConceptId,
  asset: AssetFile | null,
): {
  ratio: string;
  px: string;
} {
  switch (conceptId) {
    case 'atelier':
      if (asset && isPortrait(asset.aspect)) {
        return { ratio: '4:5', px: '1600x2000' };
      }
      return { ratio: '3:2', px: '1800x1200' };
    case 'reel':
      return { ratio: '21:9', px: '2520x1080' };
    case 'chamber':
    case 'signal':
    case 'imprint':
      return { ratio: '16:9', px: '2400x1350' };
  }
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), t | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeterministic<T>(items: T[], seed: number): T[] {
  const next = [...items];
  const random = mulberry32(seed);
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const current = next[i];
    const swap = next[j];
    if (current === undefined || swap === undefined) continue;
    next[i] = swap;
    next[j] = current;
  }
  return next;
}
