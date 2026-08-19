import { create } from 'zustand';
import { createNoirDemoProject } from '../data/demoNoir';
import type { Project, ProjectPhase, SaveStatus } from '../types/project';
import {
  clearProject,
  isStorageAvailable,
  readProject,
  writeProject,
} from '../utils/storage';
import { createEmptyProject, createProjectId } from './createEmptyProject';
import { mergeProject, type ProjectPatch } from './mergeProject';

export type HydrateError = 'corrupt' | null;

const AUTOSAVE_MS = 250;

interface ProjectStore {
  project: Project | null;
  saveStatus: SaveStatus;
  storageAvailable: boolean;
  hydrateError: HydrateError;
  createProject: () => string;
  loadProject: () => Project | null;
  loadDemoProject: () => string;
  updateProject: (partial: ProjectPatch) => void;
  deleteProject: () => void;
  setPhase: (phase: ProjectPhase) => void;
  setStep: (stepIndex: number) => void;
  flushPersist: () => void;
  discardCorrupt: () => void;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistNow(project: Project): SaveStatus {
  const written = writeProject(project);
  return written.ok ? 'saved' : 'error';
}

function readInitialState(): Pick<
  ProjectStore,
  'project' | 'saveStatus' | 'storageAvailable' | 'hydrateError'
> {
  if (typeof window === 'undefined') {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: false,
      hydrateError: null,
    };
  }

  if (!isStorageAvailable()) {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: false,
      hydrateError: null,
    };
  }

  const result = readProject();
  if (result.ok) {
    return {
      project: result.project,
      saveStatus: 'saved',
      storageAvailable: true,
      hydrateError: null,
    };
  }

  if (result.reason === 'corrupt') {
    return {
      project: null,
      saveStatus: 'idle',
      storageAvailable: true,
      hydrateError: 'corrupt',
    };
  }

  return {
    project: null,
    saveStatus: 'idle',
    storageAvailable: true,
    hydrateError: null,
  };
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  ...readInitialState(),

  createProject: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = createEmptyProject(createProjectId());
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      hydrateError: null,
      storageAvailable: saveStatus === 'saved',
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
      });
      return result.project;
    }
    if (result.reason === 'corrupt') {
      set({ project: null, hydrateError: 'corrupt', saveStatus: 'idle' });
      return null;
    }
    set({ project: null, saveStatus: 'idle' });
    return null;
  },

  loadDemoProject: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    const project = createNoirDemoProject(createProjectId());
    const saveStatus = persistNow(project);
    set({
      project,
      saveStatus,
      hydrateError: null,
      storageAvailable: saveStatus === 'saved',
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
    clearProject();
    set({ project: null, saveStatus: 'idle', hydrateError: null });
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
    });
  },

  discardCorrupt: () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    clearProject();
    set({ project: null, hydrateError: null, saveStatus: 'idle' });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useProjectStore.getState().flushPersist();
  });
}
