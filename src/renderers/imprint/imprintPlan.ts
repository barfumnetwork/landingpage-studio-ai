import { isSectionEnabled } from '../shared/sectionPlan';
import type { GeneratedConcept } from '../../types/project';

const INDEX_ORDER = [
  'hero',
  'about',
  'services',
  'gallery',
  'video',
  'story',
  'team',
  'cta',
  'contact',
] as const;

export function imprintIndex(concept: GeneratedConcept, section: string): string {
  const enabled = INDEX_ORDER.filter((item) => isSectionEnabled(concept, item));
  const index = enabled.findIndex((item) => item === section);
  const n = index < 0 ? 1 : index + 1;
  return String(n).padStart(2, '0');
}
