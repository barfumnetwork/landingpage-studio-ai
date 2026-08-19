import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import { GENERATION_PHASE_COUNT } from './generationPhases';
import { GenerationError } from './GenerationError';
import { GenerationRecovery } from './GenerationRecovery';
import { useGenerationFlow } from './useGenerationFlow';
import styles from './GenerationScreen.module.css';

export function GenerationScreen() {
  const status = useProjectStore((state) => state.generationStatus);
  const runId = useProjectStore((state) => state.generationRunId);
  const running = status === 'running';
  const flow = useGenerationFlow(runId, running);

  const phase = de.generation.phases[flow.phaseIndex] ?? de.generation.phases[0]!;
  const count = `${String(flow.phaseIndex + 1).padStart(2, '0')} / ${String(GENERATION_PHASE_COUNT).padStart(2, '0')}`;

  let live = de.generation.livePhase;
  if (status === 'error') live = de.generation.liveError;
  else if (status === 'idle') live = de.generation.liveInterrupted;
  else if (flow.phaseIndex === GENERATION_PHASE_COUNT - 1) live = de.generation.liveReady;

  return (
    <div className={styles.stage}>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
      {status === 'error' ? <GenerationError /> : null}
      {status === 'idle' ? <GenerationRecovery /> : null}
      {running ? (
        <div className={styles.ritual} aria-hidden={false}>
          <p className={styles.count}>{count}</p>
          <div className={styles.copy} key={phase.label}>
            <p className={styles.label}>{phase.label}</p>
            <h1 className={styles.headline}>{phase.text}</h1>
          </div>
          <div className={styles.track} aria-hidden="true">
            <div
              className={styles.bar}
              style={{ transform: `scaleX(${String(flow.progress)})` }}
            />
          </div>
          <div
            className={`${styles.flash} ${flow.flashing ? styles.flashOn : ''}`}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
