import type { Project } from '../../types/project';

export const WIZARD_STEP_COUNT = 12;

export const CATEGORIES = [
  'Agentur',
  'Beauty',
  'Restaurant',
  'Coach',
  'Immobilien',
  'Fashion',
  'Fitness',
  'Consulting',
  'Technologie',
  'Personal Brand',
  'Network Marketing',
  'Atelier',
  'Sonstige',
] as const;

export const CTA_INTENTS = [
  'contact',
  'whatsapp',
  'call',
  'book',
  'buy',
  'learn',
  'request',
  'website',
  'custom',
] as const;

export const STYLE_DIRECTIONS = [
  'luxury',
  'minimal',
  'editorial',
  'modern',
  'dark',
  'elegant',
  'bold',
  'creative',
  'futuristic',
  'organic',
  'corporate',
] as const;

export const STYLE_THEMES = ['light', 'dark', 'auto'] as const;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

export function canContinueStep(stepIndex: number, project: Project): boolean {
  switch (stepIndex) {
    case 0:
      return project.brand.name.trim().length >= 2;
    case 4:
      return project.about.description.trim().length >= 20;
    case 7:
      return isValidEmail(project.contact.email) && isValidUrl(project.contact.website);
    case 8:
      return (
        isValidUrl(project.social.instagram) &&
        isValidUrl(project.social.tiktok) &&
        isValidUrl(project.social.facebook) &&
        isValidUrl(project.social.linkedin) &&
        isValidUrl(project.social.youtube) &&
        project.social.extra.every((item) => isValidUrl(item.url))
      );
    case 11:
      return (
        project.brand.name.trim().length >= 2 &&
        project.about.description.trim().length >= 20
      );
    default:
      return true;
  }
}

export function isStepSkippable(stepIndex: number): boolean {
  return [1, 2, 3, 5, 6, 7, 8].includes(stepIndex);
}

export function nextEntityId(prefix: string, ids: string[]): string {
  const nums = ids
    .map((id) => Number.parseInt(id.replace(`${prefix}_`, ''), 10))
    .filter((value) => Number.isFinite(value));
  const next = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
  return `${prefix}_${String(next).padStart(2, '0')}`;
}

export function hasServiceContent(
  name: string,
  description: string,
  price: string,
): boolean {
  return (
    name.trim().length > 0 || description.trim().length > 0 || price.trim().length > 0
  );
}

export function hasPersonContent(
  name: string,
  role: string,
  description: string,
  story: string,
): boolean {
  return (
    name.trim().length > 0 ||
    role.trim().length > 0 ||
    description.trim().length > 0 ||
    story.trim().length > 0
  );
}

export function pruneEmptyEntities(
  project: Project,
): Pick<Project, 'services' | 'person' | 'team' | 'social'> {
  return {
    services: project.services.filter((item) =>
      hasServiceContent(item.name, item.description, item.price),
    ),
    person:
      project.person &&
      hasPersonContent(
        project.person.name,
        project.person.role,
        project.person.description,
        project.person.story,
      )
        ? project.person
        : null,
    team: project.team.filter((item) =>
      hasPersonContent(item.name, item.role, item.description, item.story),
    ),
    social: {
      ...project.social,
      extra: project.social.extra.filter(
        (item) => item.label.trim().length > 0 || item.url.trim().length > 0,
      ),
    },
  };
}
