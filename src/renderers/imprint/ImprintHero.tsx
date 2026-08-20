import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { BrandMark } from '../shared/BrandMark';
import { RendererMedia } from '../shared/RendererMedia';
import {
  cssAspectRatio,
  heroMediaId,
  isSectionEnabled,
  slotRatio,
} from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { imprintIndex } from './imprintPlan';
import styles from './ImprintHero.module.css';

interface ImprintHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function ImprintHero({ project, concept, reducedMotion }: ImprintHeroProps) {
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
    cssAspectRatio(slotRatio(concept, SLOTS.videoHero)) ??
    (asset?.aspect ? String(asset.aspect) : '3 / 4');
  const index = imprintIndex(concept, 'hero');

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <p className={styles.kicker} data-imprint-reveal>
        {category ? `${index} — ${category}` : index}
      </p>
      <div className={styles.mark}>
        <BrandMark
          project={project}
          concept={concept}
          tone="imprint"
          reducedMotion={reducedMotion}
        />
      </div>
      <div className={styles.rail}>
        {sub ? (
          <p className={styles.statement} data-imprint-reveal>
            {sub}
          </p>
        ) : null}
        {cta.renderable && cta.href ? (
          <a className={styles.cta} href={cta.href} data-imprint-reveal data-cursor="open">
            {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
          </a>
        ) : null}
      </div>
      {asset ? (
        <figure className={styles.media} data-imprint-media style={{ aspectRatio: ratio }}>
          <RendererMedia
            asset={asset}
            url={url}
            alt={`${brand} Hero`}
            autoPlay={asset.kind === 'video' && !reducedMotion}
          />
        </figure>
      ) : null}
    </header>
  );
}
