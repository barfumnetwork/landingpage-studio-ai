import { SLOTS } from '../../generator/schema/ids';
import type { GeneratedConcept } from '../../types/project';

export function isSectionEnabled(concept: GeneratedConcept, section: string): boolean {
  return concept.sectionPlan.some((item) => item.section === section && item.enabled);
}

export function slotId(concept: GeneratedConcept, slot: string): string | null {
  return concept.assetMap.find((item) => item.slot === slot)?.assetId ?? null;
}

export function gallerySlotIds(concept: GeneratedConcept): string[] {
  return concept.assetMap
    .filter((item) => item.slot.startsWith('GALLERY_') && item.assetId)
    .map((item) => item.assetId)
    .filter((id): id is string => id !== null);
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
