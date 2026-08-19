import { de } from '../../i18n/de';
import { resetGeneration, startGeneration } from '../../store/generationActions';
import styles from './ConceptGallery.module.css';

export function GalleryRecovery() {
  return (
    <div className={styles.recovery} role="status">
      <h1 className={styles.recoveryTitle}>{de.gallery.missingConcept}</h1>
      <div className={styles.recoveryActions}>
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
