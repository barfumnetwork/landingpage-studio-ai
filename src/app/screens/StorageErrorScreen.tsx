import { useNavigate } from 'react-router-dom';
import { de } from '../../i18n/de';
import { useProjectStore } from '../../store/projectStore';
import styles from './StorageErrorScreen.module.css';

export function StorageErrorScreen() {
  const navigate = useNavigate();
  const createProject = useProjectStore((state) => state.createProject);
  const discardCorrupt = useProjectStore((state) => state.discardCorrupt);

  function restart() {
    const id = createProject();
    navigate(`/project/${id}`);
  }

  function discard() {
    discardCorrupt();
    navigate('/');
  }

  return (
    <div className={styles.stage}>
      <h1 className={styles.title}>{de.corrupt.title}</h1>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={restart}>
          {de.corrupt.restart}
        </button>
        <button type="button" className="btn btn-secondary" onClick={discard}>
          {de.corrupt.discard}
        </button>
      </div>
    </div>
  );
}
