import { lazy, Suspense } from 'react';
import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { BrandMark } from '../shared/BrandMark';
import { RendererMedia } from '../shared/RendererMedia';
import { heroMediaId, isSectionEnabled } from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isWebGLAvailable } from '../shared/webgl';
import { signalIndex } from './signalPlan';
import styles from './SignalHero.module.css';

const SignalField = lazy(() => import('./SignalField'));

interface SignalHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function SignalHero({ project, concept, reducedMotion }: SignalHeroProps) {
  const cta = resolveCtaTarget(project);
  const heroId = heroMediaId(concept);
  const { asset, url } = useRendererAsset(project, heroId);
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const index = signalIndex(concept, 'hero');
  const showField = !reducedMotion && isWebGLAvailable();

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <div className={styles.field} data-signal-media>
        {showField ? (
          <Suspense fallback={<div className={styles.fallback} aria-hidden="true" />}>
            <SignalField imageUrl={asset?.kind === 'video' ? null : url} />
          </Suspense>
        ) : asset ? (
          <RendererMedia
            asset={asset}
            url={url}
            alt={`${brand} Hero`}
            autoPlay={asset.kind === 'video' && !reducedMotion}
          />
        ) : (
          <div className={styles.fallback} aria-hidden="true" />
        )}
      </div>
      <p className={styles.strip} data-signal-reveal>
        <span>{index}</span>
        <span>{de.gallery.names.signal}</span>
        <span>LIVE</span>
      </p>
      <div className={styles.mark}>
        <BrandMark
          project={project}
          concept={concept}
          tone="signal"
          reducedMotion={reducedMotion}
        />
      </div>
      {sub ? (
        <p className={styles.status} data-signal-reveal>
          {sub}
        </p>
      ) : null}
      {cta.renderable && cta.href ? (
        <a className={styles.cta} href={cta.href} data-signal-reveal data-cursor="open">
          {`> ${cta.label ?? de.wizard.ctaIntents[project.cta.intent]}`}
        </a>
      ) : null}
    </header>
  );
}
