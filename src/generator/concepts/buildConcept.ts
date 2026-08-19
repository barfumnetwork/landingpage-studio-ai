import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { mapAssetsFromNormalized } from '../mapping/mapAssets';
import { normalizeProject } from '../normalize/normalizeProject';
import { buildSectionPlanFromNormalized } from '../planning/buildSectionPlan';
import type { NormalizedProject } from '../schema/types';
import { conceptSeed } from './seed';

export interface BuildConceptOptions {
  extraSeed?: number;
  generatedAt?: string;
}

export function buildConceptFromNormalized(
  project: NormalizedProject,
  conceptId: ConceptId,
  options: BuildConceptOptions = {},
): GeneratedConcept {
  const seed = conceptSeed(project.id, conceptId, options.extraSeed);
  const mapping = mapAssetsFromNormalized(project, conceptId, {
    jitterSeed: options.extraSeed !== undefined ? seed : undefined,
  });
  const sectionPlan = buildSectionPlanFromNormalized(project, {
    galleryCount: mapping.galleryAssetIds.length,
  });

  return {
    id: conceptId,
    seed,
    sectionPlan,
    assetMap: mapping.items,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
  };
}

export function buildConcept(
  project: Project,
  conceptId: ConceptId,
  options: BuildConceptOptions = {},
): GeneratedConcept {
  return buildConceptFromNormalized(normalizeProject(project), conceptId, options);
}
