export interface GenerationPhaseSpec {
  index: number;
  minMs: number;
}

export const GENERATION_PHASES: readonly GenerationPhaseSpec[] = [
  { index: 0, minMs: 900 },
  { index: 1, minMs: 1100 },
  { index: 2, minMs: 1100 },
  { index: 3, minMs: 1200 },
  { index: 4, minMs: 1000 },
  { index: 5, minMs: 1200 },
  { index: 6, minMs: 900 },
  { index: 7, minMs: 800 },
] as const;

export const GENERATION_PHASE_COUNT = GENERATION_PHASES.length;

export const REDUCED_MOTION_TOTAL_MS = 400;
export const READY_FLASH_MS = 180;
export const PROGRESS_HOLD = 0.95;

export function progressForPhase(phaseIndex: number, waiting: boolean): number {
  if (phaseIndex >= GENERATION_PHASE_COUNT - 1 && !waiting) return 1;
  const steps = GENERATION_PHASE_COUNT - 1;
  const ratio = Math.min(phaseIndex + 1, steps) / steps;
  return Math.min(PROGRESS_HOLD, ratio * PROGRESS_HOLD);
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
