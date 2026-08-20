import { lazy, Suspense } from 'react';
import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { BrandMark } from '../shared/BrandMark';
import { RendererMedia } from '../shared/RendererMedia';
import { heroMediaId, isSectionEnabled, slotId } from '../shared/sectionPlan';
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
  const logo = useRendererAsset(project, slotId(concept, SLOTS.logoMain));
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const category = project.brand.category.trim();
  const showVoid = !reducedMotion && isWebGLAvailable() && !asset;

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
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
            <ChamberVoid logoUrl={logo.url} brandName={brand} />
          </Suspense>
        ) : (
          <div className={styles.volume} aria-hidden="true" />
        )}
      </div>
      <div className={styles.copy}>
        {category ? (
          <p className={styles.kicker} data-chamber-reveal>
            {category}
          </p>
        ) : null}
        <BrandMark
          project={project}
          concept={concept}
          tone="chamber"
          reducedMotion={reducedMotion}
          showLogo={!showVoid}
        />
        {sub ? (
          <p className={styles.sub} data-chamber-reveal>
            {sub}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a
            className={styles.cta}
            href={cta.href}
            data-chamber-reveal
            data-cursor="open"
          >
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
    </header>
  );
}
