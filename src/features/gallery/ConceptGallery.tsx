import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { CONCEPT_IDS, isCompleteConceptSet } from '../../generator';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { de } from '../../i18n/de';
import { hasFinalRenderer } from '../../renderers/rendererRegistry';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import { runConceptRegenerate } from '../../store/generationActions';
import { useProjectStore } from '../../store/projectStore';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import type { PreviewMode } from '../../renderers/types';
import { StructuralPreview } from './StructuralPreview';
import { ConceptCard } from './ConceptCard';
import { GalleryRecovery } from './GalleryRecovery';
import { SelectedBar } from './SelectedBar';
import styles from './ConceptGallery.module.css';

const ConceptRenderer = lazy(() =>
  import('../../renderers/ConceptRenderer').then((mod) => ({
    default: mod.ConceptRenderer,
  })),
);

interface ViewingState {
  id: ConceptId;
  mode: PreviewMode;
  origin?: { top: number; right: number; bottom: number; left: number };
}

function originFromRect(rect: DOMRect): ViewingState['origin'] {
  return {
    top: Math.max(0, rect.top),
    left: Math.max(0, rect.left),
    right: Math.max(0, window.innerWidth - rect.right),
    bottom: Math.max(0, window.innerHeight - rect.bottom),
  };
}

function ConceptPreview({
  project,
  concept,
  mode,
  onClose,
}: {
  project: Project;
  concept: GeneratedConcept;
  mode: PreviewMode;
  onClose: () => void;
}) {
  if (hasFinalRenderer(concept.id)) {
    return (
      <Suspense
        fallback={
          <p className={styles.previewLoading} role="status">
            {de.renderer.loading}
          </p>
        }
      >
        <ConceptRenderer
          project={project}
          concept={concept}
          selectedConceptId={project.selectedConceptId}
          previewMode={mode}
          onClose={onClose}
        />
      </Suspense>
    );
  }

  return (
    <StructuralPreview
      project={project}
      concept={concept}
      loadMedia
      playVideo={concept.id === 'reel'}
    />
  );
}

export function ConceptGallery() {
  const project = useProjectStore((state) => state.project);
  const selectConcept = useProjectStore((state) => state.selectConcept);
  const regeneratingId = useProjectStore((state) => state.regeneratingConceptId);
  const regenerateError = useProjectStore((state) => state.regenerateError);
  const [viewing, setViewing] = useState<ViewingState | null>(null);
  const [activeVideo, setActiveVideo] = useState<ConceptId | null>(null);
  const [filter, setFilter] = useState<ConceptId | 'all'>('all');
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  useFocusTrap(Boolean(viewing), modalRef);

  const onVisibleVideo = useCallback((id: ConceptId, visible: boolean) => {
    setActiveVideo((current) => {
      if (visible) return id;
      if (current === id) return null;
      return current;
    });
  }, []);

  useEffect(() => {
    if (!viewing) return;
    const current = viewing;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setViewing(null);
        return;
      }
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const index = CONCEPT_IDS.indexOf(current.id);
      const next =
        event.key === 'ArrowRight'
          ? CONCEPT_IDS[(index + 1) % CONCEPT_IDS.length]
          : CONCEPT_IDS[(index - 1 + CONCEPT_IDS.length) % CONCEPT_IDS.length];
      if (next) setViewing({ id: next, mode: current.mode });
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewing]);

  if (!project) return null;

  if (!isCompleteConceptSet(project.generatedConcepts)) {
    return <GalleryRecovery />;
  }

  const viewingConcept = viewing
    ? project.generatedConcepts.find((item) => item.id === viewing.id)
    : undefined;
  const finalPreview = Boolean(viewing && hasFinalRenderer(viewing.id));
  const visibleIds =
    filter === 'all' ? CONCEPT_IDS : CONCEPT_IDS.filter((id) => id === filter);

  return (
    <div className={styles.page}>
      <details className={styles.index}>
        <summary className={styles.indexSummary}>{de.gallery.index}</summary>
        <div className={styles.filters} role="tablist" aria-label={de.gallery.filterLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={filter === 'all' ? styles.filterOn : styles.filter}
            onClick={() => setFilter('all')}
          >
            {de.gallery.filterAll}
          </button>
          {CONCEPT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              className={filter === id ? styles.filterOn : styles.filter}
              onClick={() => setFilter(id)}
            >
              {de.gallery.names[id]}
            </button>
          ))}
        </div>
      </details>
      <div className={styles.list}>
        {visibleIds.map((id) => (
          <ConceptCard
            key={id}
            index={CONCEPT_IDS.indexOf(id)}
            project={project}
            concept={project.generatedConcepts.find((item) => item.id === id)}
            selected={project.selectedConceptId === id}
            regenerating={regeneratingId === id}
            regenerateError={regenerateError === id}
            playVideo={activeVideo === id}
            onView={(conceptId, rect) =>
              setViewing({ id: conceptId, mode: 'modal', origin: originFromRect(rect) })
            }
            onFullscreen={(conceptId, rect) =>
              setViewing({
                id: conceptId,
                mode: 'fullscreen',
                origin: originFromRect(rect),
              })
            }
            onSelect={selectConcept}
            onRegenerate={(conceptId) => {
              runConceptRegenerate(conceptId);
            }}
            onVisibleVideo={onVisibleVideo}
            liveWebGL={!viewing}
          />
        ))}
      </div>
      <SelectedBar />
      {viewing && viewingConcept ? (
        <div
          ref={modalRef}
          className={`${styles.modal} ${finalPreview ? styles.modalFinal : ''} ${viewing.mode === 'fullscreen' ? styles.modalFull : ''} ${viewing.origin && !reducedMotion ? styles.modalExpand : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-preview-scroller=""
          tabIndex={-1}
          style={
            viewing.origin && !reducedMotion
              ? ({
                  '--from-top': `${String(viewing.origin.top)}px`,
                  '--from-right': `${String(viewing.origin.right)}px`,
                  '--from-bottom': `${String(viewing.origin.bottom)}px`,
                  '--from-left': `${String(viewing.origin.left)}px`,
                } as CSSProperties)
              : undefined
          }
        >
          <div
            className={`${styles.modalInner} ${finalPreview ? styles.modalInnerFinal : ''}`}
          >
            <div className={styles.modalHead}>
              <h2 id={titleId} className={styles.modalTitle}>
                {de.gallery.names[viewing.id]}
              </h2>
              <div className={styles.modalTools}>
                <button
                  type="button"
                  className={styles.ghost}
                  data-cursor="next"
                  aria-label={de.a11y.previousConcept}
                  onClick={() => {
                    const index = CONCEPT_IDS.indexOf(viewing.id);
                    const prev =
                      CONCEPT_IDS[(index - 1 + CONCEPT_IDS.length) % CONCEPT_IDS.length];
                    if (prev) setViewing({ id: prev, mode: viewing.mode });
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.ghost}
                  data-cursor="next"
                  aria-label={de.a11y.nextConcept}
                  onClick={() => {
                    const index = CONCEPT_IDS.indexOf(viewing.id);
                    const next = CONCEPT_IDS[(index + 1) % CONCEPT_IDS.length];
                    if (next) setViewing({ id: next, mode: viewing.mode });
                  }}
                >
                  ›
                </button>
                <button
                  type="button"
                  className={styles.ghost}
                  onClick={() => setViewing(null)}
                  data-cursor="close"
                  aria-label={de.gallery.closePreview}
                >
                  ×
                </button>
              </div>
            </div>
            <ConceptPreview
              project={project}
              concept={viewingConcept}
              mode={viewing.mode}
              onClose={() => setViewing(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
