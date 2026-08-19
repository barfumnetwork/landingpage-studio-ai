import { useEffect, useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { de } from '../../i18n/de';
import { startGeneration } from '../../store/generationActions';
import { useProjectStore } from '../../store/projectStore';
import { ImagesStep } from '../assets/ImagesStep';
import { LogoStep } from '../assets/LogoStep';
import { VideosStep } from '../assets/VideosStep';
import { AboutStep } from './steps/AboutStep';
import { BrandStep } from './steps/BrandStep';
import { ContactStep } from './steps/ContactStep';
import { CtaStep } from './steps/CtaStep';
import { ReviewStep } from './steps/ReviewStep';
import { ServicesStep } from './steps/ServicesStep';
import { SocialStep } from './steps/SocialStep';
import { StyleStep } from './steps/StyleStep';
import { TeamStep } from './steps/TeamStep';
import styles from './WizardScreen.module.css';
import {
  WIZARD_STEP_COUNT,
  canContinueStep,
  isStepSkippable,
  pruneEmptyEntities,
} from './wizardConfig';

const QUESTIONS = [
  de.wizard.steps.brand.question,
  de.wizard.steps.logo.question,
  de.wizard.steps.images.question,
  de.wizard.steps.videos.question,
  de.wizard.steps.about.question,
  de.wizard.steps.services.question,
  de.wizard.steps.team.question,
  de.wizard.steps.contact.question,
  de.wizard.steps.social.question,
  de.wizard.steps.cta.question,
  de.wizard.steps.style.question,
  de.wizard.steps.review.question,
];

function clampStep(stepIndex: number): number {
  return Math.min(Math.max(stepIndex, 0), WIZARD_STEP_COUNT - 1);
}

function persistPrune(): void {
  const current = useProjectStore.getState().project;
  if (!current) return;
  useProjectStore.getState().updateProject(pruneEmptyEntities(current));
}

export function WizardScreen() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const project = useProjectStore((state) => state.project);
  const setStep = useProjectStore((state) => state.setStep);
  const flushPersist = useProjectStore((state) => state.flushPersist);
  const generationStatus = useProjectStore((state) => state.generationStatus);
  const paneRef = useRef<HTMLDivElement>(null);

  const stepIndex = project ? clampStep(project.stepIndex) : 0;
  const canContinue = project ? canContinueStep(stepIndex, project) : false;
  const skippable = isStepSkippable(stepIndex);
  const isReview = stepIndex === 11;

  useEffect(() => {
    if (!project) return;
    if (project.stepIndex !== stepIndex) setStep(stepIndex);
  }, [project, setStep, stepIndex]);

  useEffect(() => {
    const pane = paneRef.current;
    pane?.scrollTo({ top: 0 });
    const primary = pane?.querySelector<HTMLElement>('[data-wizard-primary]');
    if (primary) {
      primary.focus();
      return;
    }
    document.querySelector<HTMLElement>('[data-wizard-skip]')?.focus();
  }, [stepIndex]);

  if (!project) {
    return <Navigate to="/" replace />;
  }

  if (projectId !== project.id) {
    return <Navigate to={`/project/${project.id}`} replace />;
  }

  function goTo(nextIndex: number): void {
    persistPrune();
    setStep(clampStep(nextIndex));
  }

  function onBack(): void {
    if (stepIndex === 0) {
      persistPrune();
      flushPersist();
      navigate('/');
      return;
    }
    goTo(stepIndex - 1);
  }

  function onNext(): void {
    if (!canContinue || isReview) return;
    goTo(stepIndex + 1);
  }

  function onSkip(): void {
    if (!skippable) return;
    goTo(stepIndex + 1);
  }

  function onGenerate(): void {
    persistPrune();
    const latest = useProjectStore.getState().project;
    if (!latest || !canContinueStep(11, latest)) return;
    flushPersist();
    startGeneration();
  }

  const progress = `${String(stepIndex + 1).padStart(2, '0')} / ${String(WIZARD_STEP_COUNT).padStart(2, '0')}`;
  const skipLabel = stepIndex === 1 ? de.wizard.steps.logo.skip : de.wizard.skip;

  return (
    <div className={styles.frame}>
      <p className={styles.progress} aria-live="polite">
        {progress}
      </p>
      <div
        className={styles.stage}
        ref={paneRef}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          if (event.target instanceof HTMLTextAreaElement) return;
          if (!(event.target instanceof HTMLInputElement)) return;
          event.preventDefault();
          onNext();
        }}
      >
        <h1 className={styles.question}>{QUESTIONS[stepIndex]}</h1>
        <div className={styles.pane} key={stepIndex}>
          {stepIndex === 0 ? <BrandStep /> : null}
          {stepIndex === 1 ? <LogoStep /> : null}
          {stepIndex === 2 ? <ImagesStep /> : null}
          {stepIndex === 3 ? <VideosStep /> : null}
          {stepIndex === 4 ? <AboutStep /> : null}
          {stepIndex === 5 ? <ServicesStep /> : null}
          {stepIndex === 6 ? <TeamStep /> : null}
          {stepIndex === 7 ? <ContactStep /> : null}
          {stepIndex === 8 ? <SocialStep /> : null}
          {stepIndex === 9 ? <CtaStep /> : null}
          {stepIndex === 10 ? <StyleStep /> : null}
          {stepIndex === 11 ? <ReviewStep onJump={goTo} /> : null}
        </div>
      </div>
      <div className={styles.actions}>
        <div className={styles.actionsLeft}>
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            {de.wizard.back}
          </button>
        </div>
        <div className={styles.actionsRight}>
          {skippable ? (
            <button
              type="button"
              className="btn btn-tertiary"
              data-wizard-skip
              onClick={onSkip}
            >
              {skipLabel}
            </button>
          ) : null}
          {isReview ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canContinue || generationStatus === 'running'}
              onClick={onGenerate}
            >
              {de.wizard.generate}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canContinue}
              onClick={onNext}
            >
              {de.wizard.next}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
