import { de } from '../../i18n/de';
import { resetGeneration, startGeneration } from '../../store/generationActions';
import styles from './GenerationScreen.module.css';

export function GenerationRecovery() {
  return (
    <div className={styles.message} role="status">
      <p className={styles.messageEyebrow}>RECOVERY</p>
      <h1 className={styles.messageTitle}>{de.generation.recoveryTitle}</h1>
      <p className={styles.messageBody}>{de.generation.recoveryBody}</p>
      <div className={styles.messageActions}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => startGeneration()}
        >
          {de.generation.retry}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => resetGeneration()}
        >
          {de.generation.backToReview}
        </button>
      </div>
    </div>
  );
}
