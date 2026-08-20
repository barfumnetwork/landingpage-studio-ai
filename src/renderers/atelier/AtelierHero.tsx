import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
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
        {`${brand || de.gallery.names.atelier}  ·  Vol. 01`}
      </p>
      <div className={styles.spread}>
        <div className={styles.copy}>
          <p className={styles.mast} data-atelier-reveal>
            {de.gallery.names.atelier}
          </p>
          <p className={styles.line} data-atelier-reveal>
            {de.gallery.world.atelier}
          </p>
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
            <CampaignStill still={CAMPAIGN.atelier.figure} eager sizes="(max-width: 900px) 52vw, 58vw" />
          )}
          <figcaption>
            <span>01  Figure</span>
          </figcaption>
        </figure>
        <div className={styles.folioRow}>
          <figure className={styles.plateB} style={ratio ? { aspectRatio: ratio } : undefined}>
            <CampaignStill still={CAMPAIGN.atelier.materials} sizes="(max-width: 900px) 28vw, 18vw" />
            <figcaption>02  Material</figcaption>
          </figure>
          <figure className={styles.plateC}>
            <CampaignStill still={CAMPAIGN.atelier.interior} sizes="(max-width: 900px) 28vw, 18vw" />
            <figcaption>03  Interior</figcaption>
          </figure>
        </div>
      </div>
    </header>
  );
}
