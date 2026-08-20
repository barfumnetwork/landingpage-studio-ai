import { useEffect, useRef } from 'react';
import { useFinePointer } from '../../hooks/useFinePointer';
import { usePointerParallax } from '../../hooks/usePointerParallax';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import { de } from '../../i18n/de';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { useInView } from '../preview/useInView';
import { ConceptActions } from './ConceptActions';
import { StructuralPreview } from './StructuralPreview';
import styles from './ConceptCard.module.css';

interface ConceptCardProps {
  index: number;
  project: Project;
  concept: GeneratedConcept | undefined;
  selected: boolean;
  regenerating: boolean;
  regenerateError: boolean;
  playVideo: boolean;
  onView: (id: ConceptId) => void;
  onFullscreen: (id: ConceptId) => void;
  onSelect: (id: ConceptId) => void;
  onRegenerate: (id: ConceptId) => void;
  onVisibleVideo: (id: ConceptId, visible: boolean) => void;
}

export function ConceptCard({
  index,
  project,
  concept,
  selected,
  regenerating,
  regenerateError,
  playVideo,
  onView,
  onFullscreen,
  onSelect,
  onRegenerate,
  onVisibleVideo,
}: ConceptCardProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  usePointerParallax(ref, 4, fine && !reduced && Boolean(concept));
  const skins = {
    chamber: styles.chamber,
    atelier: styles.atelier,
    signal: styles.signal,
    reel: styles.reel,
    imprint: styles.imprint,
  } as const;
  const number = String(index + 1).padStart(2, '0');
  const hasVideo = Boolean(
    concept?.sectionPlan.some((item) => item.section === 'video' && item.enabled),
  );

  useEffect(() => {
    if (!concept || !hasVideo) return;
    onVisibleVideo(concept.id, inView);
    return () => onVisibleVideo(concept.id, false);
  }, [concept, hasVideo, inView, onVisibleVideo]);

  if (!concept) {
    return (
      <article className={styles.card} aria-label={de.gallery.missingConcept}>
        <h2 className={styles.title}>{de.gallery.missingConcept}</h2>
      </article>
    );
  }

  return (
    <article
      ref={ref}
      className={`${styles.card} ${skins[concept.id]} ${selected ? styles.selected : ''}`}
      aria-labelledby={`concept-${concept.id}`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <button
        type="button"
        className={styles.stage}
        onClick={() => onView(concept.id)}
        data-cursor="view"
        aria-labelledby={`concept-${concept.id}`}
      >
        <StructuralPreview
          project={project}
          concept={concept}
          loadMedia={inView}
          playVideo={playVideo && inView}
          updating={regenerating}
        />
        <span className={styles.overlay}>
          <span className={styles.eyebrow}>{number}</span>
          <h2 id={`concept-${concept.id}`} className={styles.title}>
            {de.gallery.names[concept.id]}
          </h2>
          {selected ? <span className={styles.badge}>{de.gallery.selected}</span> : null}
        </span>
      </button>
      {regenerateError ? (
        <p className={styles.error} role="alert">
          {de.gallery.regenerateError}
        </p>
      ) : null}
      <ConceptActions
        conceptId={concept.id}
        selected={selected}
        regenerating={regenerating}
        onView={() => onView(concept.id)}
        onFullscreen={() => onFullscreen(concept.id)}
        onSelect={() => onSelect(concept.id)}
        onRegenerate={() => onRegenerate(concept.id)}
      />
    </article>
  );
}
