import type { ConceptId } from '../../types/project';

export const CONCEPT_IDS: readonly ConceptId[] = [
  'chamber',
  'atelier',
  'signal',
  'reel',
  'imprint',
] as const;

export const SECTION_CATALOG = [
  'hero',
  'nav',
  'about',
  'services',
  'gallery',
  'video',
  'story',
  'team',
  'cta',
  'contact',
  'footer',
] as const;

export type SectionId = (typeof SECTION_CATALOG)[number];

export const SLOTS = {
  logoMain: 'LOGO_MAIN',
  imageHero: 'IMAGE_HERO',
  imageAbout: 'IMAGE_ABOUT',
  person: 'PERSON',
  videoHero: 'VIDEO_HERO',
  videoStory: 'VIDEO_STORY',
} as const;

export function serviceSlot(index: number): string {
  return `SERVICE_${String(index + 1).padStart(2, '0')}`;
}

export function teamSlot(index: number): string {
  return `TEAM_${String(index + 1).padStart(2, '0')}`;
}

export function gallerySlot(index: number): string {
  return `GALLERY_${String(index + 1).padStart(2, '0')}`;
}

export function extraVideoSlot(index: number): string {
  return `VIDEO_${String(index + 1).padStart(2, '0')}`;
}
