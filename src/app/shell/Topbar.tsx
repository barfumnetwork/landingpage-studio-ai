import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { de } from '../../i18n/de';
import { pruneEmptyEntities } from '../../features/wizard/wizardConfig';
import { useProjectStore } from '../../store/projectStore';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './Topbar.module.css';

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const project = useProjectStore((state) => state.project);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const inWizard = location.pathname.startsWith('/project/');

  let status: string | null = null;
  if (project) {
    if (saveStatus === 'saving') status = de.saving;
    else if (saveStatus === 'saved') status = de.saved;
    else if (saveStatus === 'error') status = de.storageUnavailable;
  }

  function leaveToWelcome() {
    const current = useProjectStore.getState().project;
    if (current) {
      useProjectStore.getState().updateProject(pruneEmptyEntities(current));
      useProjectStore.getState().flushPersist();
    }
    setLeaveOpen(false);
    navigate('/');
  }

  return (
    <header className={styles.topbar}>
      {inWizard ? (
        <button
          type="button"
          className={styles.wordmark}
          onClick={() => setLeaveOpen(true)}
        >
          {de.appName}
        </button>
      ) : (
        <Link to="/" className={styles.wordmark}>
          {de.appName}
        </Link>
      )}
      {status ? (
        <p className={styles.status} aria-live="polite">
          {status}
        </p>
      ) : (
        <span className={styles.statusSpacer} aria-hidden="true" />
      )}
      <ConfirmDialog
        open={leaveOpen}
        title={de.leave.title}
        body={de.leave.body}
        cancelLabel={de.leave.cancel}
        confirmLabel={de.leave.confirm}
        onCancel={() => setLeaveOpen(false)}
        onConfirm={leaveToWelcome}
      />
    </header>
  );
}
