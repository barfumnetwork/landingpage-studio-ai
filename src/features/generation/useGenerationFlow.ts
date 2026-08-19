import { useEffect, useState } from 'react';
import { isCompleteConceptSet } from '../../generator';
import {
  completeGeneration,
  computeGenerationPlan,
  failGeneration,
} from '../../store/generationActions';
import {
  GENERATION_PHASE_COUNT,
  GENERATION_PHASES,
  READY_FLASH_MS,
  REDUCED_MOTION_TOTAL_MS,
  prefersReducedMotion,
  progressForPhase,
  sleep,
} from './generationPhases';

export interface GenerationFlowState {
  phaseIndex: number;
  progress: number;
  flashing: boolean;
  waiting: boolean;
}

export function useGenerationFlow(runId: number, active: boolean): GenerationFlowState {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [flashing, setFlashing] = useState(false);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    async function run(): Promise<void> {
      const engine = Promise.resolve().then(() => computeGenerationPlan());
      const reduced = prefersReducedMotion();

      if (reduced) {
        setPhaseIndex(0);
        setProgress(1);
        await sleep(REDUCED_MOTION_TOTAL_MS);
        if (cancelled) return;
        const result = await engine;
        if (cancelled) return;
        if (!result.ok || !isCompleteConceptSet(result.concepts)) {
          failGeneration(runId);
          return;
        }
        completeGeneration(result.concepts, runId);
        return;
      }

      const ritual = GENERATION_PHASES.slice(0, GENERATION_PHASE_COUNT - 1);
      for (const phase of ritual) {
        if (cancelled) return;
        setPhaseIndex(phase.index);
        setWaiting(false);
        setProgress(progressForPhase(phase.index, false));
        await sleep(phase.minMs);
      }

      if (cancelled) return;
      setWaiting(true);
      setProgress(progressForPhase(GENERATION_PHASE_COUNT - 2, true));
      const result = await engine;
      if (cancelled) return;

      if (!result.ok || !isCompleteConceptSet(result.concepts)) {
        failGeneration(runId);
        return;
      }

      setWaiting(false);
      setPhaseIndex(GENERATION_PHASE_COUNT - 1);
      setProgress(1);
      setFlashing(true);
      await sleep(READY_FLASH_MS);
      if (cancelled) return;
      setFlashing(false);
      await sleep(GENERATION_PHASES[GENERATION_PHASE_COUNT - 1]!.minMs - READY_FLASH_MS);
      if (cancelled) return;
      completeGeneration(result.concepts, runId);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [active, runId]);

  return { phaseIndex, progress, flashing, waiting };
}
