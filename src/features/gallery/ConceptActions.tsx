import { de } from '../../i18n/de';
import type { ConceptId } from '../../types/project';
import styles from './ConceptCard.module.css';

interface ConceptActionsProps {
  conceptId: ConceptId;
  selected: boolean;
  regenerating: boolean;
  onView: () => void;
  onFullscreen: () => void;
  onSelect: () => void;
  onRegenerate: () => void;
}

export function ConceptActions({
  conceptId,
  selected,
  regenerating,
  onView,
  onFullscreen,
  onSelect,
  onRegenerate,
}: ConceptActionsProps) {
  const name = de.gallery.names[conceptId];
  return (
    <details className={styles.more}>
      <summary className={styles.moreSummary} aria-label={de.gallery.actions}>
        ···
      </summary>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.link}
          onClick={onView}
          aria-label={`${de.gallery.view} ${name}`}
        >
          {de.gallery.view}
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={onFullscreen}
          aria-label={`${de.gallery.fullscreen} ${name}`}
        >
          {de.gallery.fullscreen}
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`${de.gallery.select} ${name}`}
        >
          {selected ? de.gallery.selected : de.gallery.select}
        </button>
        <button
          type="button"
          className={styles.link}
          onClick={onRegenerate}
          disabled={regenerating}
          aria-label={`${de.gallery.regenerate} ${name}`}
        >
          {de.gallery.regenerate}
        </button>
      </div>
    </details>
  );
}
