import { SLOTS } from '../../generator/schema/ids';
import type { GeneratedConcept } from '../../types/project';

export function isSectionEnabled(concept: GeneratedConcept, section: string): boolean {
  return concept.sectionPlan.some((item) => item.section === section && item.enabled);
}

export function slotId(concept: GeneratedConcept, slot: string): string | null {
  return concept.assetMap.find((item) => item.slot === slot)?.assetId ?? null;
}

export function gallerySlotIds(concept: GeneratedConcept): string[] {
  return mappedGallery(concept).map((item) => item.assetId);
}

export function mappedGallery(
  concept: GeneratedConcept,
): Array<{ assetId: string; ratio: string }> {
  const items: Array<{ assetId: string; ratio: string }> = [];
  for (const item of concept.assetMap) {
    if (!item.slot.startsWith('GALLERY_') || !item.assetId) continue;
    items.push({ assetId: item.assetId, ratio: item.recommendedRatio });
  }
  return items;
}

export function slotRatio(concept: GeneratedConcept, slot: string): string | null {
  return concept.assetMap.find((item) => item.slot === slot)?.recommendedRatio ?? null;
}

export function cssAspectRatio(ratio: string | null | undefined): string | undefined {
  if (!ratio) return undefined;
  const match = /^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/.exec(ratio);
  if (!match) return undefined;
  return `${match[1]} / ${match[2]}`;
}

export function heroMediaId(concept: GeneratedConcept): string | null {
  return slotId(concept, SLOTS.imageHero) ?? slotId(concept, SLOTS.videoHero);
}

export function videoSectionId(concept: GeneratedConcept): string | null {
  const storyId = slotId(concept, SLOTS.videoStory);
  if (storyId) return storyId;
  const heroImageId = slotId(concept, SLOTS.imageHero);
  const heroVideoId = slotId(concept, SLOTS.videoHero);
  if (heroImageId) return heroVideoId;
  return null;
}
