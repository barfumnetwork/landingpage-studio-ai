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
  const cursors: Record<ConceptId, { view: string; full: string }> = {
    chamber: { view: 'enter', full: 'enter' },
    atelier: { view: 'open', full: 'open' },
    signal: { view: 'distort', full: 'distort' },
    reel: { view: 'play', full: 'play' },
    imprint: { view: 'explore', full: 'explore' },
  };
  const name = de.gallery.names[conceptId];
  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.link}
        onClick={onView}
        data-cursor={cursors[conceptId].view}
        aria-label={`${de.gallery.view} ${name}`}
      >
        {de.gallery.view}
      </button>
      <button
        type="button"
        className={styles.link}
        onClick={onFullscreen}
        data-cursor={cursors[conceptId].full}
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
