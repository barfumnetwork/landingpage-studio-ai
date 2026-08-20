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
import styles from './AtelierHero.module.css';

interface AtelierHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
}

export function AtelierHero({ project, concept, reducedMotion }: AtelierHeroProps) {
  const cta = resolveCtaTarget(project);
  const heroId = heroMediaId(concept);
  const { asset, url } = useRendererAsset(project, heroId);
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const category = project.brand.category.trim();
  const portrait = Boolean(asset && asset.aspect !== null && asset.aspect < 1);
  const ratio =
    cssAspectRatio(slotRatio(concept, SLOTS.imageHero)) ??
    (asset?.aspect ? String(asset.aspect) : undefined);

  if (!isSectionEnabled(concept, 'hero')) return null;

  const copy = (
    <div className={styles.copy}>
      {category ? (
        <p className={styles.kicker} data-atelier-reveal>
          {category}
        </p>
      ) : null}
      <BrandMark
        project={project}
        concept={concept}
        tone="atelier"
        reducedMotion={reducedMotion}
      />
      {sub ? (
        <p className={styles.sub} data-atelier-reveal>
          {sub}
        </p>
      ) : null}
      {cta.renderable && cta.href ? (
        <a className={styles.cta} href={cta.href} data-atelier-reveal data-cursor="open">
          {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
        </a>
      ) : null}
    </div>
  );

  if (!asset) {
    return <header className={`${styles.hero} ${styles.typeOnly}`}>{copy}</header>;
  }

  return (
    <header className={`${styles.hero} ${portrait ? styles.portrait : styles.landscape}`}>
      {copy}
      <div
        className={styles.media}
        data-atelier-media
        style={portrait && ratio ? { aspectRatio: ratio } : undefined}
      >
        <RendererMedia
          asset={asset}
          url={url}
          alt={`${brand} Hero`}
          autoPlay={asset.kind === 'video' && !reducedMotion}
        />
      </div>
    </header>
  );
}
