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
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onView}
        aria-label={`${de.gallery.view} ${de.gallery.names[conceptId]}`}
      >
        {de.gallery.view}
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onFullscreen}
        aria-label={`${de.gallery.fullscreen} ${de.gallery.names[conceptId]}`}
      >
        {de.gallery.fullscreen}
      </button>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${de.gallery.select} ${de.gallery.names[conceptId]}`}
      >
        {de.gallery.select}
      </button>
      <button
        type="button"
        className="btn btn-tertiary"
        onClick={onRegenerate}
        disabled={regenerating}
        aria-label={`${de.gallery.regenerate} ${de.gallery.names[conceptId]}`}
      >
        {de.gallery.regenerate}
      </button>
    </div>
  );
}
