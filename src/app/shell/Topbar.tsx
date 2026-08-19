import { Link } from 'react-router-dom';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import styles from './Topbar.module.css';

export function Topbar() {
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const project = useProjectStore((state) => state.project);

  let status: string | null = null;
  if (project) {
    if (saveStatus === 'saving') status = de.saving;
    else if (saveStatus === 'saved') status = de.saved;
    else if (saveStatus === 'error') status = de.storageUnavailable;
  }

  return (
    <header className={styles.topbar}>
      <Link to="/" className={styles.wordmark}>
        {de.appName}
      </Link>
      {status ? (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      ) : (
        <span className={styles.statusSpacer} aria-hidden="true" />
      )}
    </header>
  );
}
