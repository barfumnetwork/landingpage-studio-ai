import type { GeneratedConcept, Project } from '../../types/project';
import { normalizeProject } from '../normalize/normalizeProject';
import { CONCEPT_IDS } from '../schema/ids';
import type { NormalizedProject } from '../schema/types';
import { buildConceptFromNormalized, type BuildConceptOptions } from './buildConcept';

export function buildAllConceptsFromNormalized(
  project: NormalizedProject,
  options: BuildConceptOptions = {},
): GeneratedConcept[] {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  return CONCEPT_IDS.map((conceptId) =>
    buildConceptFromNormalized(project, conceptId, { ...options, generatedAt }),
  );
}

export function buildAllConcepts(
  project: Project,
  options: BuildConceptOptions = {},
): GeneratedConcept[] {
  return buildAllConceptsFromNormalized(normalizeProject(project), options);
}
