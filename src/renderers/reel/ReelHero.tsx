import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { RendererMedia } from '../shared/RendererMedia';
import { isSectionEnabled } from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { reelHeroMediaId } from './reelPlan';
import styles from './ReelHero.module.css';

interface ReelHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function ReelHero({ project, concept, reducedMotion }: ReelHeroProps) {
  const cta = resolveCtaTarget(project);
  const heroId = reelHeroMediaId(concept);
  const { asset, url } = useRendererAsset(project, heroId);
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const category = project.brand.category.trim();

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <div className={styles.media} data-reel-media>
        {asset ? (
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
      <div className={styles.copy}>
        <p className={styles.kicker} data-reel-reveal>
          {category ? `01 / ${category}` : '01'}
        </p>
        <h1 className={styles.name} data-reel-reveal>
          {brand}
        </h1>
        {sub ? (
          <p className={styles.sub} data-reel-reveal>
            {sub}
          </p>
        ) : null}
        {asset?.kind === 'video' ? (
          <p className={styles.meta} data-reel-reveal>
            {de.gallery.sectionLabels.video}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a className={styles.cta} href={cta.href} data-reel-reveal>
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
    </header>
  );
}
