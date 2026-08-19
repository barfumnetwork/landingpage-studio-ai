import { lazy, Suspense } from 'react';
import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { RendererMedia } from '../shared/RendererMedia';
import { heroMediaId, isSectionEnabled } from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isWebGLAvailable } from '../shared/webgl';
import styles from './ChamberHero.module.css';

const ChamberVoid = lazy(() => import('./ChamberVoid'));

interface ChamberHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function ChamberHero({ project, concept, reducedMotion }: ChamberHeroProps) {
  const cta = resolveCtaTarget(project);
  const heroId = heroMediaId(concept);
  const { asset, url } = useRendererAsset(project, heroId);
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const showVoid = !asset && !reducedMotion && isWebGLAvailable();

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <h1 className={styles.name} data-chamber-reveal>
          {brand}
        </h1>
        {sub ? (
          <p className={styles.sub} data-chamber-reveal>
            {sub}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a className={styles.cta} href={cta.href} data-chamber-reveal>
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
      <div className={styles.media} data-chamber-media>
        {asset ? (
          <RendererMedia
            asset={asset}
            url={url}
            alt={`${brand} Hero`}
            autoPlay={asset.kind === 'video' && !reducedMotion}
          />
        ) : showVoid ? (
          <Suspense fallback={<div className={styles.volume} aria-hidden="true" />}>
            <ChamberVoid />
          </Suspense>
        ) : (
          <div className={styles.volume} aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
