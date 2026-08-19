import type { Project, SectionPlanItem } from '../../types/project';
import { normalizeProject } from '../normalize/normalizeProject';
import { SECTION_CATALOG, type SectionId } from '../schema/ids';
import type { NormalizedProject } from '../schema/types';
import {
  hasAboutData,
  hasContactData,
  hasExclusiveStoryData,
  hasTeamData,
} from './assignContent';

export interface SectionPlanContext {
  galleryCount: number;
}

function item(
  section: SectionId,
  enabled: boolean,
  reason: SectionPlanItem['reason'],
): SectionPlanItem {
  return { section, enabled, reason };
}

function always(section: SectionId): SectionPlanItem {
  return item(section, true, 'always');
}

function fromData(section: SectionId, enabled: boolean): SectionPlanItem {
  return item(section, enabled, enabled ? 'has-data' : 'skipped-empty');
}

export function buildSectionPlanFromNormalized(
  project: NormalizedProject,
  context: SectionPlanContext,
): SectionPlanItem[] {
  const byId: Record<SectionId, SectionPlanItem> = {
    hero: always('hero'),
    nav: always('nav'),
    about: fromData('about', hasAboutData(project)),
    services: fromData('services', project.services.length > 0),
    gallery: fromData('gallery', context.galleryCount >= 3),
    video: fromData('video', project.media.videos.length > 0),
    story: fromData('story', hasExclusiveStoryData(project)),
    team: fromData('team', hasTeamData(project)),
    cta: always('cta'),
    contact: fromData('contact', hasContactData(project)),
    footer: always('footer'),
  };

  return SECTION_CATALOG.map((section) => byId[section]);
}

export function buildSectionPlan(
  project: Project,
  context: SectionPlanContext = { galleryCount: 0 },
): SectionPlanItem[] {
  return buildSectionPlanFromNormalized(normalizeProject(project), context);
}
