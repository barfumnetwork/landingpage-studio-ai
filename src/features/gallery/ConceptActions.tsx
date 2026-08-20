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
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.link}
        onClick={onView}
        data-cursor="view"
        aria-label={`${de.gallery.view} ${name}`}
      >
        {de.gallery.view}
      </button>
      <button
        type="button"
        className={styles.link}
        onClick={onFullscreen}
        data-cursor="explore"
        aria-label={`${de.gallery.fullscreen} ${name}`}
      >
        {de.gallery.fullscreen}
      </button>
      <button
        type="button"
        className={styles.link}
        onClick={onSelect}
        data-cursor="open"
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
  );
}
