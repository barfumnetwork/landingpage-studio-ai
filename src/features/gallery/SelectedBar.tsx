import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportAllConcepts, exportSelectedConcept } from '../../export/exportZip';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import styles from './ConceptGallery.module.css';

type ExportMessage = 'preparing' | 'unavailable' | 'failed' | 'needSelect' | null;

export function SelectedBar() {
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.project);
  const markExported = useProjectStore((state) => state.markExported);
  const selected = project?.selectedConceptId ?? null;
  const canOpen = Boolean(project && selected);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ExportMessage>(null);

  function hint(): string | null {
    if (message === 'preparing') return de.export.preparing;
    if (message === 'unavailable') return de.export.unavailable;
    if (message === 'failed') return de.export.failed;
    if (message === 'needSelect') return de.export.needSelect;
    return null;
  }

  function openSite(): void {
    if (!project || !selected) return;
    navigate(`/project/${project.id}/view/${selected}`);
  }

  async function runExport(kind: 'selected' | 'all'): Promise<void> {
    if (!project || busy) return;
    if (kind === 'selected' && !selected) {
      setMessage('needSelect');
      return;
    }
    setBusy(true);
    setMessage('preparing');
    const result =
      kind === 'selected'
        ? await exportSelectedConcept(project)
        : await exportAllConcepts(project);
    setBusy(false);
    if (result.ok) {
      markExported();
      setMessage(null);
      return;
    }
    setMessage(result.reason === 'no-selection' ? 'needSelect' : result.reason);
  }

  const status = hint();

  return (
    <details className={styles.bar}>
      <summary className={styles.barSummary}>{de.gallery.tools}</summary>
      {status ? (
        <p className={styles.barHint} role="status">
          {status}
        </p>
      ) : null}
      <div className={styles.barActions}>
        <button
          type="button"
          className={styles.link}
          disabled={!canOpen || busy}
          onClick={openSite}
        >
          {de.gallery.openSite}
        </button>
        <button
          type="button"
          className={styles.link}
          disabled={busy}
          onClick={() => {
            void runExport('selected');
          }}
        >
          {de.gallery.exportSite}
        </button>
        <button
          type="button"
          className={styles.link}
          disabled={busy}
          onClick={() => {
            void runExport('all');
          }}
        >
          {de.gallery.exportAll}
        </button>
      </div>
    </details>
  );
}
