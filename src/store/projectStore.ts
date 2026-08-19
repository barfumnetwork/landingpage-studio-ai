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

export type HydrateError = 'corrupt' | null;

interface ProjectStore {
  project: Project | null;
  saveStatus: SaveStatus;
  storageAvailable: boolean;
  hydrateError: HydrateError;
  createProject: () => string;
  loadProject: () => Project | null;
  loadDemoProject: () => string;
  updateProject: (partial: Partial<Project>) => void;
  deleteProject: () => void;
  setPhase: (phase: ProjectPhase) => void;
  setStep: (stepIndex: number) => void;
  discardCorrupt: () => void;
}

function persist(project: Project): SaveStatus {
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
    const project = createEmptyProject(createProjectId());
    const saveStatus = persist(project);
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
    const project = createNoirDemoProject(createProjectId());
    const saveStatus = persist(project);
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
    set({ saveStatus: 'saving' });
    const project: Project = {
      ...current,
      ...partial,
      savedAt: new Date().toISOString(),
    };
    const saveStatus = persist(project);
    set({
      project,
      saveStatus,
      storageAvailable: saveStatus === 'saved',
    });
  },

  deleteProject: () => {
    clearProject();
    set({ project: null, saveStatus: 'idle', hydrateError: null });
  },

  setPhase: (phase) => {
    get().updateProject({ phase });
  },

  setStep: (stepIndex) => {
    get().updateProject({ stepIndex });
  },

  discardCorrupt: () => {
    clearProject();
    set({ project: null, hydrateError: null, saveStatus: 'idle' });
  },
}));
