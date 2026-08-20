import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { BrandMark } from '../shared/BrandMark';
import { CinematicVideo } from './CinematicVideo';
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
  const hasPicture = Boolean(asset);

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={`${styles.hero} ${hasPicture ? '' : styles.titleCard}`}>
      <div className={styles.media} data-reel-media>
        {asset?.kind === 'video' ? (
          <CinematicVideo
            url={url ?? ''}
            alt={`${brand} Hero`}
            autoPlay={!reducedMotion && Boolean(url)}
          />
        ) : asset ? (
          <RendererMedia asset={asset} url={url} alt={`${brand} Hero`} autoPlay={false} />
        ) : (
          <div className={styles.fallback} aria-hidden="true" />
        )}
      </div>
      <div className={`${styles.bar} ${styles.barTop}`} data-reel-bar="" aria-hidden="true" />
      <div className={`${styles.bar} ${styles.barBottom}`} data-reel-bar="" aria-hidden="true" />
      <p className={styles.kicker} data-reel-reveal>
        {category ? `01  ${category}` : '01'}
      </p>
      <div className={`${styles.title} ${hasPicture ? styles.credit : ''}`}>
        <BrandMark
          project={project}
          concept={concept}
          tone="reel"
          reducedMotion={reducedMotion}
        />
        {sub && !hasPicture ? (
          <p className={styles.hold} data-reel-reveal>
            {sub}
          </p>
        ) : null}
      </div>
      <div className={styles.dock}>
        {asset?.kind === 'video' ? (
          <p className={styles.meta} data-reel-reveal>
            {de.gallery.sectionLabels.video}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a className={styles.cta} href={cta.href} data-reel-reveal data-cursor="open">
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
    </header>
  );
}
