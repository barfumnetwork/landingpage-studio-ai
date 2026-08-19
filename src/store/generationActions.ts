import {
  generateProjectConcepts,
  isCompleteConceptSet,
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

export function computeGenerationPlan(
  options: GenerateOptions = {},
): GenerationPlanResult {
  const project = useProjectStore.getState().project;
  if (!project) return emptyFail('project.missing');
  return generateProjectConcepts(project, options);
}

export function startGeneration(): boolean {
  return useProjectStore.getState().startGeneration();
}

export function completeGeneration(
  concepts: GenerationPlanResult['concepts'],
  runId: number,
): boolean {
  if (!isCompleteConceptSet(concepts)) return false;
  return useProjectStore.getState().completeGeneration(concepts, runId);
}

export function failGeneration(runId: number): void {
  useProjectStore.getState().failGeneration(runId);
}

export function resetGeneration(): void {
  useProjectStore.getState().resetGeneration();
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

  if (!isCompleteConceptSet(concepts)) {
    return {
      ok: false,
      concepts: [],
      errors: prepared.errors,
      normalized: null,
      content: null,
      cta: null,
      sectionPlans: null,
    };
  }

  store.updateProject({ generatedConcepts: concepts });
  store.flushPersist();
  return { ...prepared, concepts };
}

export function runConceptRegenerate(conceptId: ConceptId): boolean {
  const store = useProjectStore.getState();
  if (!store.beginRegenerate(conceptId)) return false;
  const result = regenerateConceptPlan(conceptId);
  if (!result.ok) {
    store.failRegenerate(conceptId);
    return false;
  }
  store.finishRegenerate();
  return true;
}
