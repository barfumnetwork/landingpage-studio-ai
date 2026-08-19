import type { Project } from '../types/project';

export const PROJECT_STORAGE_KEY = 'lps.project.v1';

export type StorageReadResult =
  | { ok: true; project: Project }
  | { ok: false; reason: 'missing' | 'corrupt' | 'unavailable' };

export type StorageWriteResult = { ok: true } | { ok: false; reason: 'unavailable' };

const PHASES: Project['phase'][] = [
  'welcome',
  'wizard',
  'generating',
  'gallery',
  'selected',
  'exported',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.id !== 'string' || value.id.length < 1) return false;
  if (
    typeof value.phase !== 'string' ||
    !PHASES.includes(value.phase as Project['phase'])
  ) {
    return false;
  }
  if (typeof value.stepIndex !== 'number') return false;
  if (typeof value.isDemo !== 'boolean') return false;
  if (!isRecord(value.brand) || typeof value.brand.name !== 'string') return false;
  if (!isRecord(value.about) || typeof value.about.description !== 'string') return false;
  if (!isRecord(value.logo)) return false;
  if (!isRecord(value.media)) return false;
  if (!Array.isArray(value.services)) return false;
  if (!isRecord(value.contact) || !isRecord(value.social)) return false;
  if (!isRecord(value.cta) || !isRecord(value.style)) return false;
  if (!Array.isArray(value.generatedConcepts)) return false;
  return true;
}

export function isStorageAvailable(): boolean {
  try {
    const probe = '__lps_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readProject(): StorageReadResult {
  if (!isStorageAvailable()) {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return { ok: false, reason: 'missing' };
    const parsed: unknown = JSON.parse(raw);
    if (!isProject(parsed)) return { ok: false, reason: 'corrupt' };
    return { ok: true, project: parsed };
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
}

export function writeProject(project: Project): StorageWriteResult {
  if (!isStorageAvailable()) {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export function clearProject(): StorageWriteResult {
  if (!isStorageAvailable()) {
    return { ok: false, reason: 'unavailable' };
  }

  try {
    window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
