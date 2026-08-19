import type { ConceptId, Project, SectionPlanItem } from '../types/project';
import { buildAllConceptsFromNormalized } from './concepts/buildAllConcepts';
import { resolveCtaTargetFromNormalized } from './cta/resolveCtaTarget';
import { normalizeProject } from './normalize/normalizeProject';
import { assignContent } from './planning/assignContent';
import { CONCEPT_IDS } from './schema/ids';
import type { GenerationPlanResult } from './schema/types';
import { validateGenerationData } from './validate/validateGenerationData';

export interface GenerateOptions {
  extraSeed?: number;
  generatedAt?: string;
}

export function generateProjectConcepts(
  project: Project,
  options: GenerateOptions = {},
): GenerationPlanResult {
  const errors = validateGenerationData(project);
  if (errors.length > 0) {
    return {
      ok: false,
      concepts: [],
      errors,
      normalized: null,
      content: null,
      cta: null,
      sectionPlans: null,
    };
  }

  const normalized = normalizeProject(project);
  const concepts = buildAllConceptsFromNormalized(normalized, options);
  const sectionPlans = {} as Record<ConceptId, SectionPlanItem[]>;
  for (const concept of concepts) {
    sectionPlans[concept.id] = concept.sectionPlan;
  }

  return {
    ok: true,
    concepts,
    errors: [],
    normalized,
    content: assignContent(normalized),
    cta: resolveCtaTargetFromNormalized(normalized),
    sectionPlans,
  };
}

export function isCompleteConceptSet(concepts: Project['generatedConcepts']): boolean {
  if (concepts.length !== CONCEPT_IDS.length) return false;
  return CONCEPT_IDS.every((id) => concepts.some((item) => item.id === id));
}
