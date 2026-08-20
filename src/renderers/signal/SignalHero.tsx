import { lazy, Suspense } from 'react';
import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { RendererMedia } from '../shared/RendererMedia';
import {
  cssAspectRatio,
  heroMediaId,
  isSectionEnabled,
  slotRatio,
} from '../shared/sectionPlan';
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
  const category = project.brand.category.trim();
  const ratio =
    cssAspectRatio(slotRatio(concept, SLOTS.imageHero)) ??
    (asset?.aspect ? String(asset.aspect) : '16 / 9');
  const index = signalIndex(concept, 'hero');
  const showField = !reducedMotion && isWebGLAvailable();

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.kicker} data-signal-reveal>
          {category ? `${index} / ${category}` : index}
        </p>
        <h1 className={styles.name} data-signal-reveal>
          {brand}
        </h1>
        {sub ? (
          <p className={styles.sub} data-signal-reveal>
            {sub}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a className={styles.cta} href={cta.href} data-signal-reveal>
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
      <div
        className={styles.media}
        data-signal-media
        style={asset ? { aspectRatio: ratio } : undefined}
      >
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
    </header>
  );
}
