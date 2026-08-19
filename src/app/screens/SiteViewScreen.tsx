import { lazy, Suspense } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { CONCEPT_IDS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import { hasFinalRenderer } from '../../renderers/rendererRegistry';
import { useProjectStore } from '../../store/projectStore';
import type { ConceptId } from '../../types/project';
import styles from './SiteViewScreen.module.css';

const ConceptRenderer = lazy(() =>
  import('../../renderers/ConceptRenderer').then((mod) => ({
    default: mod.ConceptRenderer,
  })),
);

function isConceptId(value: string | undefined): value is ConceptId {
  return CONCEPT_IDS.some((id) => id === value);
}

export function SiteViewScreen() {
  const { projectId, conceptId } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  if (projectId !== project.id) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  if (!isConceptId(conceptId)) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  const concept = project.generatedConcepts.find((item) => item.id === conceptId);
  if (!concept || !hasFinalRenderer(conceptId)) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  const currentId = project.id;

  function close(): void {
    navigate(`/project/${currentId}`);
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={close}>
        {de.gallery.closeSite}
      </button>
      <Suspense
        fallback={
          <p className={styles.loading} role="status">
            {de.renderer.loading}
          </p>
        }
      >
        <ConceptRenderer
          project={project}
          concept={concept}
          selectedConceptId={project.selectedConceptId}
          previewMode="site"
          onClose={close}
        />
      </Suspense>
    </div>
  );
}
