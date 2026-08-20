import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import { BrandMark } from '../shared/BrandMark';
import { CampaignStill } from '../shared/CampaignStill';
import { CAMPAIGN } from '../shared/campaignAssets';
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
  const ratio =
    cssAspectRatio(slotRatio(concept, SLOTS.imageHero)) ??
    (asset?.aspect ? String(asset.aspect) : undefined);

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <p className={styles.issue} data-atelier-reveal>
        {`Vol. 01  ·  ${de.gallery.names.atelier}`}
      </p>
      <div className={styles.spread}>
        <div className={styles.copy}>
          <BrandMark
            project={project}
            concept={concept}
            tone="atelier"
            reducedMotion={reducedMotion}
            variant="editorial"
          />
          {sub ? (
            <p className={styles.column} data-atelier-reveal>
              {sub}
            </p>
          ) : null}
          {cta.renderable && cta.href ? (
            <a className={styles.captionCta} href={cta.href} data-atelier-reveal data-cursor="open">
              {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
            </a>
          ) : null}
        </div>
        <figure className={styles.plateA} data-atelier-media>
          {asset && url ? (
            <RendererMedia
              asset={asset}
              url={url}
              alt={`${brand} Hero`}
              autoPlay={asset.kind === 'video' && !reducedMotion}
            />
          ) : (
            <CampaignStill still={CAMPAIGN.atelier.figure} eager sizes="(max-width: 900px) 100vw, 58vw" />
          )}
          <figcaption>
            <span>PLATE 01</span>
            <em>{asset ? 'STUDIO' : '120 × 160'}</em>
          </figcaption>
        </figure>
      </div>
      <div className={styles.folioRow}>
        <figure className={styles.plateB} style={ratio ? { aspectRatio: ratio } : undefined}>
          <CampaignStill still={CAMPAIGN.atelier.materials} sizes="(max-width: 900px) 50vw, 28vw" />
          <figcaption>PLATE 02</figcaption>
        </figure>
        <figure className={styles.plateC}>
          <CampaignStill still={CAMPAIGN.atelier.interior} sizes="(max-width: 900px) 50vw, 28vw" />
          <figcaption>PLATE 03</figcaption>
        </figure>
      </div>
    </header>
  );
}
