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
  onView: (id: ConceptId, origin: DOMRect) => void;
  onFullscreen: (id: ConceptId, origin: DOMRect) => void;
  onSelect: (id: ConceptId) => void;
  onRegenerate: (id: ConceptId) => void;
  onVisibleVideo: (id: ConceptId, visible: boolean) => void;
  liveWebGL?: boolean;
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
  liveWebGL = true,
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

  const current = concept;

  function open(mode: 'modal' | 'fullscreen'): void {
    const rect = ref.current?.getBoundingClientRect();
    const box = rect ?? new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    if (mode === 'modal') onView(current.id, box);
    else onFullscreen(current.id, box);
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
        onClick={() => open('modal')}
        aria-labelledby={`concept-${concept.id}`}
      >
        <StructuralPreview
          project={project}
          concept={concept}
          loadMedia={inView}
          playVideo={playVideo && inView}
          updating={regenerating}
          liveWebGL={liveWebGL}
        />
        <span className={styles.overlay}>
          <h2 id={`concept-${concept.id}`} className={styles.title}>
            {de.gallery.names[concept.id]}
          </h2>
          <span className={styles.world}>{de.gallery.world[concept.id]}</span>
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
        onView={() => open('modal')}
        onFullscreen={() => open('fullscreen')}
        onSelect={() => onSelect(concept.id)}
        onRegenerate={() => onRegenerate(concept.id)}
      />
    </article>
  );
}
