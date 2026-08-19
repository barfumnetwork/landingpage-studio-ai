import { de } from '../../i18n/de';
import styles from './ConceptGallery.module.css';

export function SelectedBar() {
  return (
    <div className={styles.bar}>
      <p className={styles.barHint}>{de.gallery.exportSoon}</p>
      <div className={styles.barActions}>
        <button type="button" className="btn btn-primary" disabled>
          {de.gallery.exportSite}
        </button>
        <button type="button" className="btn btn-secondary" disabled>
          {de.gallery.exportAll}
        </button>
      </div>
    </div>
  );
}
