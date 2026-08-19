import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { normalizeProject } from '../normalize/normalizeProject';
import { CONCEPT_IDS } from '../schema/ids';
import { buildConceptFromNormalized } from './buildConcept';

export function regenerateConcept(
  project: Project,
  conceptId: ConceptId,
  extraSeed: number,
  generatedAt = new Date().toISOString(),
): GeneratedConcept {
  return buildConceptFromNormalized(normalizeProject(project), conceptId, {
    extraSeed,
    generatedAt,
  });
}

export function replaceGeneratedConcept(
  concepts: GeneratedConcept[],
  next: GeneratedConcept,
): GeneratedConcept[] {
  const byId = new Map(concepts.map((item) => [item.id, item]));
  byId.set(next.id, next);
  return CONCEPT_IDS.map((id) => byId.get(id)).filter(
    (item): item is GeneratedConcept => item !== undefined,
  );
}
