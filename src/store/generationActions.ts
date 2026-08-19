import {
  generateProjectConcepts,
  regenerateConcept,
  replaceGeneratedConcept,
  validateGenerationData,
  type GenerateOptions,
  type GenerationPlanResult,
} from '../generator';
import type { ConceptId } from '../types/project';
import { useProjectStore } from './projectStore';

function emptyFail(
  code: GenerationPlanResult['errors'][number]['code'],
): GenerationPlanResult {
  return {
    ok: false,
    concepts: [],
    errors: [{ code }],
    normalized: null,
    content: null,
    cta: null,
    sectionPlans: null,
  };
}

export function buildGenerationPlan(options: GenerateOptions = {}): GenerationPlanResult {
  const store = useProjectStore.getState();
  const project = store.project;
  if (!project) return emptyFail('project.missing');

  const result = generateProjectConcepts(project, options);
  if (!result.ok) return result;

  store.updateProject({ generatedConcepts: result.concepts });
  store.flushPersist();
  return result;
}

export function regenerateConceptPlan(conceptId: ConceptId): GenerationPlanResult {
  const store = useProjectStore.getState();
  const project = store.project;
  if (!project) return emptyFail('project.missing');

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

  const prepared = generateProjectConcepts(project);
  if (!prepared.ok) return prepared;

  const source =
    project.generatedConcepts.length === 5
      ? project.generatedConcepts
      : prepared.concepts;
  const existing = source.find((item) => item.id === conceptId);
  const extraSeed = (existing?.seed ?? 0) + 1;
  const next = regenerateConcept(project, conceptId, extraSeed);
  const concepts = replaceGeneratedConcept(source, next);

  store.updateProject({ generatedConcepts: concepts });
  store.flushPersist();
  return { ...prepared, concepts };
}
