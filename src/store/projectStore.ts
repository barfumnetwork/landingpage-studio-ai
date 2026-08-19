import { create } from 'zustand';
import { createNoirDemoProject } from '../data/demoNoir';
import type {
  ConceptId,
  GeneratedConcept,
  Project,
  ProjectPhase,
  SaveStatus,
} from '../types/project';
import { deleteAssetBlobs } from '../utils/assetDb';
import { revokeObjectUrls } from '../utils/objectUrls';
import {
  clearProject,
  isStorageAvailable,
  readProject,
  writeProject,
} from '../utils/storage';
import { collectProjectBlobKeys } from './collectBlobKeys';
import { createEmptyProject, createProjectId } from './createEmptyProject';
import { mergeProject, type ProjectPatch } from './mergeProject';

export type HydrateError = 'corrupt' | null;

export type GenerationStatus = 'idle' | 'running' | 'error';

const AUTOSAVE_MS = 250;

interface ProjectStore {
  project: Project | null;
  saveStatus: SaveStatus;
  storageAvailable: boolean;
  hydrateError: HydrateError;
  generationStatus: GenerationStatus;
  generationRunId: number;
  regeneratingConceptId: ConceptId | null;
  regenerateError: ConceptId | null;
  createProject: () => string;
  loadProject: () => Project | null;
  loadDemoProject: () => string;
  updateProject: (partial: ProjectPatch) => void;
  deleteProject: () => void;
  setPhase: (phase: ProjectPhase) => void;
  setStep: (stepIndex: number) => void;
  flushPersist: () => void;
  discardCorrupt: () => void;
  startGeneration: () => boolean;
  completeGeneration: (concepts: GeneratedConcept[], runId: number) => boolean;
  failGeneration: (runId: number) => void;
  resetGeneration: () => void;
  selectConcept: (id: ConceptId) => void;
  markExported: () => void;
  beginRegenerate: (id: ConceptId) => boolean;
  finishRegenerate: () => void;
  failRegenerate: (id: ConceptId) => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistNow(project: Project): SaveStatus {
  const written = writeProject(project);
  return written.ok ? 'saved' : 'error';
}

const SESSION_DEFAULTS = {
  generationStatus: 'idle' as GenerationStatus,
  generationRunId: 0,
  regeneratingConceptId: null as ConceptId | null,
  regenerateError: null as ConceptId | null,
};

function readInitialState(): Pick<
  ProjectStore,
  | 'project'
  | 'saveStatus'
  | 'storageAvailable'
  | 'hydrateError'
  | 'generationStatus'
  | 'generationRunId'
  | 'regeneratingConceptId'
  | 'regenerateError'
> {
  if (typeof window === 'undefined') {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: false,
      hydrateError: null,
      ...SESSION_DEFAULTS,
    };
  }

  if (!isStorageAvailable()) {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: false,
      hydrateError: null,
      ...SESSION_DEFAULTS,
    };
  }

  const result = readProject();
  if (result.ok) {
    return {
      project: result.project,
      saveStatus: 'saved',
      storageAvailable: true,
      hydrateError: null,
      ...SESSION_DEFAULTS,
    };
  }

  if (result.reason === 'corrupt') {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: true,
      hydrateError: 'corrupt',
      ...SESSION_DEFAULTS,
    };
  }

  return {
    project: null,
    saveStatus: 'idle',
    storageAvailable: true,
    hydrateError: null,
    ...SESSION_DEFAULTS,
  };
}

function disposeCurrentAssets(get: () => { project: Project | null }): void {
  const project = get().project;
  if (!project) return;
  const keys = collectProjectBlobKeys(project);
  revokeObjectUrls(keys);
  void deleteAssetBlobs(keys);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...readInitialState(),

  createProject: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    void disposeCurrentAssets(get);
    const project = createEmptyProject(createProjectId());
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      hydrateError: null,
      storageAvailable: saveStatus === 'saved',
      ...SESSION_DEFAULTS,
    });
    return project.id;
  },

  loadProject: () => {
    const result = readProject();
    if (result.ok) {
      set({
        project: result.project,
        saveStatus: 'saved',
        hydrateError: null,
        storageAvailable: true,
        ...SESSION_DEFAULTS,
      });
      return result.project;
    }
    if (result.reason === 'corrupt') {
      set({
        project: null,
        hydrateError: 'corrupt',
        saveStatus: 'idle',
        ...SESSION_DEFAULTS,
      });
      return null;
    }
    set({ project: null, saveStatus: 'idle', ...SESSION_DEFAULTS });
    return null;
  },

  loadDemoProject: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    void disposeCurrentAssets(get);
    const project = createNoirDemoProject(createProjectId());
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      hydrateError: null,
      storageAvailable: saveStatus === 'saved',
      ...SESSION_DEFAULTS,
    });
    return project.id;
  },

  updateProject: (partial) => {
    const current = get().project;
    if (!current) return;
    const project = mergeProject(current, partial);
    set({ project, saveStatus: 'saving' });
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const latest = get().project;
      if (!latest) return;
      const saveStatus = persistNow(latest);
      set({
        saveStatus,
        storageAvailable: saveStatus === 'saved',
      });
    }, AUTOSAVE_MS);
  },

  flushPersist: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = get().project;
    if (!project) return;
    const saveStatus = persistNow(project);
    set({
      saveStatus,
      storageAvailable: saveStatus === 'saved',
    });
  },

  deleteProject: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    void disposeCurrentAssets(get);
    clearProject();
    set({ project: null, saveStatus: 'idle', hydrateError: null, ...SESSION_DEFAULTS });
  },

  setPhase: (phase) => {
    const current = get().project;
    if (!current) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, { phase });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
    });
  },

  setStep: (stepIndex) => {
    const current = get().project;
    if (!current) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, { stepIndex, phase: 'wizard' });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
      generationStatus: 'idle',
    });
  },

  discardCorrupt: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    clearProject();
    set({ project: null, hydrateError: null, saveStatus: 'idle', ...SESSION_DEFAULTS });
  },

  startGeneration: () => {
    const current = get().project;
    if (!current) return false;
    if (get().generationStatus === 'running') return false;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const runId = get().generationRunId + 1;
    const project = mergeProject(current, { phase: 'generating' });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
      generationStatus: 'running',
      generationRunId: runId,
      regenerateError: null,
      regeneratingConceptId: null,
    });
    return true;
  },

  completeGeneration: (concepts, runId) => {
    const current = get().project;
    if (!current) return false;
    if (get().generationRunId !== runId) return false;
    if (get().generationStatus !== 'running') return false;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, {
      generatedConcepts: concepts,
      phase: 'gallery',
    });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
      generationStatus: 'idle',
    });
    return true;
  },

  failGeneration: (runId) => {
    if (get().generationRunId !== runId) return;
    if (get().generationStatus !== 'running') return;
    set({ generationStatus: 'error' });
  },

  resetGeneration: () => {
    const current = get().project;
    if (!current) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, { stepIndex: 11, phase: 'wizard' });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
      generationStatus: 'idle',
    });
  },

  selectConcept: (id) => {
    const current = get().project;
    if (!current) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, {
      selectedConceptId: id,
      phase: 'selected',
    });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
    });
  },

  markExported: () => {
    const current = get().project;
    if (!current || !current.selectedConceptId) return;
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = mergeProject(current, { phase: 'exported' });
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
    });
  },

  beginRegenerate: (id) => {
    if (get().generationStatus === 'running') return false;
    if (get().regeneratingConceptId !== null) return false;
    set({ regeneratingConceptId: id, regenerateError: null });
    return true;
  },

  finishRegenerate: () => {
    set({ regeneratingConceptId: null });
  },

  failRegenerate: (id) => {
    set({ regeneratingConceptId: null, regenerateError: id });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useProjectStore.getState().flushPersist();
  });
}
