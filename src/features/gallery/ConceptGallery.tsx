import { useCallback, useEffect, useId, useState } from 'react';
import { CONCEPT_IDS, isCompleteConceptSet } from '../../generator';
import { de } from '../../i18n/de';
import { runConceptRegenerate } from '../../store/generationActions';
import { useProjectStore } from '../../store/projectStore';
import type { ConceptId } from '../../types/project';
import { ConceptCard } from './ConceptCard';
import { GalleryRecovery } from './GalleryRecovery';
import { SelectedBar } from './SelectedBar';
import { StructuralPreview } from './StructuralPreview';
import styles from './ConceptGallery.module.css';

export function ConceptGallery() {
  const project = useProjectStore((state) => state.project);
  const selectConcept = useProjectStore((state) => state.selectConcept);
  const regeneratingId = useProjectStore((state) => state.regeneratingConceptId);
  const regenerateError = useProjectStore((state) => state.regenerateError);
  const [viewing, setViewing] = useState<ConceptId | null>(null);
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

  const viewingConcept = project.generatedConcepts.find((item) => item.id === viewing);

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
            onView={setViewing}
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
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className={styles.modalInner}>
            <div className={styles.modalHead}>
              <h2 id={titleId} className={styles.modalTitle}>
                {de.gallery.names[viewing]}
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
            <StructuralPreview
              project={project}
              concept={viewingConcept}
              loadMedia
              playVideo={viewing === 'reel'}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
