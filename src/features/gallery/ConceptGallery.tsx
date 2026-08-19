import { lazy, Suspense, useCallback, useEffect, useId, useState } from 'react';
import { CONCEPT_IDS, isCompleteConceptSet } from '../../generator';
import { de } from '../../i18n/de';
import { hasFinalRenderer } from '../../renderers/rendererRegistry';
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
  const titleId = useId();

  const onVisibleVideo = useCallback((id: ConceptId, visible: boolean) => {
    setActiveVideo((current) => {
      if (visible) return id;
      if (current === id) return null;
      return current;
    });
  }, []);

  useEffect(() => {
    if (!viewing) return;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') setViewing(null);
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

  return (
    <div className={styles.page}>
      <div className={styles.list}>
        {CONCEPT_IDS.map((id, index) => (
          <ConceptCard
            key={id}
            index={index}
            project={project}
            concept={project.generatedConcepts.find((item) => item.id === id)}
            selected={project.selectedConceptId === id}
            regenerating={regeneratingId === id}
            regenerateError={regenerateError === id}
            playVideo={activeVideo === id}
            onView={(conceptId) => setViewing({ id: conceptId, mode: 'modal' })}
            onFullscreen={(conceptId) =>
              setViewing({ id: conceptId, mode: 'fullscreen' })
            }
            onSelect={selectConcept}
            onRegenerate={(conceptId) => {
              runConceptRegenerate(conceptId);
            }}
            onVisibleVideo={onVisibleVideo}
          />
        ))}
      </div>
      <SelectedBar />
      {viewing && viewingConcept ? (
        <div
          className={`${styles.modal} ${finalPreview ? styles.modalFinal : ''} ${viewing.mode === 'fullscreen' ? styles.modalFull : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div
            className={`${styles.modalInner} ${finalPreview ? styles.modalInnerFinal : ''}`}
          >
            <div className={styles.modalHead}>
              <h2 id={titleId} className={styles.modalTitle}>
                {de.gallery.names[viewing.id]}
              </h2>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewing(null)}
                autoFocus
              >
                {de.gallery.closePreview}
              </button>
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
