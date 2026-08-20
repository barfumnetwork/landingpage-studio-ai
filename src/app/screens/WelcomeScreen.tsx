import { useRef, useState, type PointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinePointer } from '../../hooks/useFinePointer';
import { useMagnetic } from '../../hooks/useMagnetic';
import { de } from '../../i18n/de';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import { useProjectStore } from '../../store/projectStore';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import styles from './WelcomeScreen.module.css';

type PendingAction = 'create' | 'demo' | null;

function Headline() {
  const words = de.welcome.headline.split(' ');

  return (
    <h1 className={styles.headline}>
      {words.map((word, index) => (
        <span
          key={`${word}-${String(index)}`}
          className={styles.word}
          style={{ animationDelay: `${index * 80}ms` }}
        >
          {word}
        </span>
      ))}
    </h1>
  );
}

export function WelcomeScreen() {
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.project);
  const createProject = useProjectStore((state) => state.createProject);
  const loadProject = useProjectStore((state) => state.loadProject);
  const loadDemoProject = useProjectStore((state) => state.loadDemoProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const [pending, setPending] = useState<PendingAction>(null);
  const createRef = useRef<HTMLButtonElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  useMagnetic(createRef, fine && !reduced, 16);

  const hasProject = project !== null;

  function goToProject(id: string) {
    navigate(`/project/${id}`);
  }

  function runCreate() {
    const id = createProject();
    goToProject(id);
  }

  function runDemo() {
    const id = loadDemoProject();
    goToProject(id);
  }

  function onCreate() {
    if (hasProject) {
      setPending('create');
      return;
    }
    runCreate();
  }

  function onDemo() {
    if (hasProject) {
      setPending('demo');
      return;
    }
    runDemo();
  }

  function onContinue() {
    const loaded = loadProject();
    if (!loaded) return;
    goToProject(loaded.id);
  }

  function onConfirm() {
    deleteProject();
    if (pending === 'demo') runDemo();
    else runCreate();
    setPending(null);
  }

  return (
    <div
      className={styles.stage}
      onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty(
          '--mx',
          `${event.clientX - rect.left - rect.width / 2}px`,
        );
        event.currentTarget.style.setProperty(
          '--my',
          `${event.clientY - rect.top - rect.height / 2}px`,
        );
      }}
    >
      <div className={styles.inner}>
        <Headline />
        <p className={styles.subline}>{de.welcome.subline}</p>
        <div className={styles.actions}>
          <button
            ref={createRef}
            type="button"
            className="btn btn-primary"
            onClick={onCreate}
          >
            {de.welcome.create}
          </button>
          {hasProject ? (
            <button type="button" className="btn btn-secondary" onClick={onContinue}>
              {de.welcome.continue}
            </button>
          ) : null}
        </div>
        <div className={styles.meta}>
          {hasProject ? (
            <button
              type="button"
              className="btn btn-tertiary"
              onClick={() => setPending('create')}
            >
              {de.welcome.newProject}
            </button>
          ) : null}
          <button type="button" className="btn btn-tertiary" onClick={onDemo}>
            {de.welcome.demo}
          </button>
        </div>
        <p className={styles.hint}>{de.welcome.autosaveHint}</p>
      </div>
      <ConfirmDialog
        open={pending !== null}
        onCancel={() => setPending(null)}
        onConfirm={onConfirm}
      />
    </div>
  );
}
