import type { AssetFile, ConceptId } from '../../types/project';
import { isLandscape, isPortrait, isWide, pixelArea } from './assetHelpers';

const ORDER_BONUS = 120;
const LANDSCAPE_BONUS = 400_000;
const WIDE_BONUS = 280_000;
const PORTRAIT_BONUS = 360_000;

export function scoreHeroAsset(
  asset: AssetFile,
  index: number,
  imageCount: number,
  conceptId: ConceptId,
): number {
  const order = Math.max(imageCount - index, 0) * ORDER_BONUS;
  const area = pixelArea(asset);
  const landscape = isLandscape(asset.aspect) ? LANDSCAPE_BONUS : 0;
  const wide = isWide(asset.aspect) ? WIDE_BONUS : 0;
  const portrait = isPortrait(asset.aspect) ? PORTRAIT_BONUS : 0;

  switch (conceptId) {
    case 'chamber':
    case 'signal':
      return area + landscape + wide + order;
    case 'atelier':
      return area + portrait + landscape * 0.7 + order;
    case 'reel':
      return area + wide * 1.4 + landscape + order;
    case 'imprint':
      return area + order;
  }
}

export function pickHeroAsset(
  pool: AssetFile[],
  allImages: AssetFile[],
  conceptId: ConceptId,
): AssetFile | null {
  if (pool.length === 0) return null;

  const ranked = (candidates: AssetFile[]): AssetFile => {
    let best = candidates[0]!;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const asset of candidates) {
      const index = allImages.findIndex((item) => item.id === asset.id);
      const score = scoreHeroAsset(
        asset,
        index < 0 ? allImages.length : index,
        allImages.length,
        conceptId,
      );
      if (score > bestScore) {
        best = asset;
        bestScore = score;
      }
    }
    return best;
  };

  switch (conceptId) {
    case 'chamber':
    case 'signal': {
      const landscapes = pool.filter((item) => isLandscape(item.aspect));
      return ranked(landscapes.length > 0 ? landscapes : pool);
    }
    case 'reel': {
      const wides = pool.filter((item) => isWide(item.aspect));
      if (wides.length > 0) return ranked(wides);
      const landscapes = pool.filter((item) => isLandscape(item.aspect));
      if (landscapes.length > 0) return ranked(landscapes);
      return ranked(pool);
    }
    case 'atelier':
    case 'imprint':
      return ranked(pool);
  }
}

export function pickPortraitOrNext(pool: AssetFile[]): AssetFile | null {
  if (pool.length === 0) return null;
  const portraits = pool.filter((item) => isPortrait(item.aspect));
  if (portraits.length === 0) return pool[0] ?? null;
  let best = portraits[0]!;
  let bestArea = pixelArea(best);
  for (const asset of portraits) {
    const area = pixelArea(asset);
    if (area > bestArea) {
      best = asset;
      bestArea = area;
    }
  }
  return best;
}
