import { Outlet } from 'react-router-dom';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import { StorageErrorScreen } from '../screens/StorageErrorScreen';
import styles from './AppShell.module.css';
import { Topbar } from './Topbar';

export function AppShell() {
  const storageAvailable = useProjectStore((state) => state.storageAvailable);
  const hydrateError = useProjectStore((state) => state.hydrateError);

  return (
    <div className={styles.shell}>
      <Topbar />
      {!storageAvailable && hydrateError === null ? (
        <p className={styles.storageHint} role="status">
          {de.storageUnavailable}
        </p>
      ) : null}
      <main className={styles.main}>
        {hydrateError === 'corrupt' ? <StorageErrorScreen /> : <Outlet />}
      </main>
    </div>
  );
}
