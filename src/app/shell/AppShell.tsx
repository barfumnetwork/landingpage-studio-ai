import { Outlet, useLocation } from 'react-router-dom';
import { useAssetDbAvailable } from '../../features/assets/useAssetDbAvailable';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import { StorageErrorScreen } from '../screens/StorageErrorScreen';
import styles from './AppShell.module.css';
import { Topbar } from './Topbar';

export function AppShell() {
  const storageAvailable = useProjectStore((state) => state.storageAvailable);
  const hydrateError = useProjectStore((state) => state.hydrateError);
  const assetDbAvailable = useAssetDbAvailable();

  const location = useLocation();
  const phase = useProjectStore((state) => state.project?.phase);
  const isSiteView = /\/view\//.test(location.pathname);
  const hideChrome = phase === 'generating' || isSiteView;

  return (
    <div className={styles.shell}>
      {hideChrome ? null : <Topbar />}
      {!hideChrome && !storageAvailable && hydrateError === null ? (
        <p className={styles.storageHint} role="status">
          {de.storageUnavailable}
        </p>
      ) : null}
      {!hideChrome && !assetDbAvailable ? (
        <p className={styles.storageHint} role="status">
          {de.assetDbUnavailable}
        </p>
      ) : null}
      <main className={styles.main}>
        {hydrateError === 'corrupt' ? <StorageErrorScreen /> : <Outlet />}
      </main>
    </div>
  );
}
