import { Navigate, useParams } from 'react-router-dom';
import { ConceptGallery } from '../../features/gallery/ConceptGallery';
import { GenerationScreen } from '../../features/generation/GenerationScreen';
import { WizardScreen } from '../../features/wizard/WizardScreen';
import { useProjectStore } from '../../store/projectStore';

export function ProjectScreen() {
  const { projectId } = useParams();
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  if (projectId !== project.id) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  if (project.phase === 'generating') {
    return <GenerationScreen />;
  }

  if (
    project.phase === 'gallery' ||
    project.phase === 'selected' ||
    project.phase === 'exported'
  ) {
    return <ConceptGallery />;
  }

  return <WizardScreen />;
}
