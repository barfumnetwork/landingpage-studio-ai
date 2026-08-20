import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import type { PreviewMode } from '../types';
import { isSectionEnabled } from '../shared/sectionPlan';
import styles from './ChamberHero.module.css';

interface ChamberHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
  previewMode?: PreviewMode;
}

export function ChamberHero({
  project,
  concept,
  previewMode = 'site',
}: ChamberHeroProps) {
  const cta = resolveCtaTarget(project);
  const claim = project.brand.claim.trim();
  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={`${styles.hero} ${previewMode === 'modal' ? styles.heroModal : ''}`}>
      <p className={styles.kicker} data-chamber-reveal>
        Infinity
      </p>
      <h1 className={styles.title} data-chamber-reveal>
        Phoenix
      </h1>
      <p className={styles.line} data-chamber-reveal>
        Reborn in glass.
      </p>
      <p className={styles.meta} data-chamber-reveal>
        {de.gallery.world.chamber}
        {claim ? `  ·  ${claim}` : ''}
      </p>
      {cta.renderable && cta.href ? (
        <a className={styles.cta} href={cta.href} data-chamber-reveal data-cursor="enter">
          {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
        </a>
      ) : null}
    </header>
  );
}
