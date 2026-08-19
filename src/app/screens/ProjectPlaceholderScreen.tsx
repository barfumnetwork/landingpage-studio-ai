import { Link, Navigate, useParams } from 'react-router-dom';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import styles from './ProjectPlaceholderScreen.module.css';

export function ProjectPlaceholderScreen() {
  const { projectId } = useParams();
  const project = useProjectStore((state) => state.project);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  if (projectId !== project.id) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  return (
    <div className={styles.stage}>
      <p className={styles.kicker}>
        {project.isDemo ? de.placeholder.demoLoaded : project.brand.name || project.id}
      </p>
      <h1 className={styles.title}>{de.placeholder.created}</h1>
      <p className={styles.body}>{de.placeholder.wizardNext}</p>
      <Link to="/" className="btn btn-secondary">
        {de.placeholder.back}
      </Link>
    </div>
  );
}
