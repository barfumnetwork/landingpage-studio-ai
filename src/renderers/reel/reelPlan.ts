import { SLOTS } from '../../generator/schema/ids';
import type { GeneratedConcept } from '../../types/project';
import { slotId } from '../shared/sectionPlan';

export function reelHeroMediaId(concept: GeneratedConcept): string | null {
  return slotId(concept, SLOTS.videoHero) ?? slotId(concept, SLOTS.imageHero);
}

export function reelVideoSectionId(concept: GeneratedConcept): string | null {
  return slotId(concept, SLOTS.videoStory);
}
