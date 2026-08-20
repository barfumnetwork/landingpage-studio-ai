import { lazy, Suspense } from 'react';
import { resolveCtaTarget } from '../../generator';
import { SLOTS } from '../../generator/schema/ids';
import { de } from '../../i18n/de';
import type { GeneratedConcept, Project } from '../../types/project';
import type { PreviewMode } from '../types';
import { BrandMark } from '../shared/BrandMark';
import { CampaignStill } from '../shared/CampaignStill';
import { CAMPAIGN } from '../shared/campaignAssets';
import { heroMediaId, isSectionEnabled, slotId } from '../shared/sectionPlan';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isWebGLAvailable } from '../shared/webgl';
import styles from './ChamberHero.module.css';

const ChamberVoid = lazy(() => import('./ChamberVoid'));

interface ChamberHeroProps {
  project: Project;
  concept: GeneratedConcept;
  reducedMotion: boolean;
  previewMode?: PreviewMode;
}

export function ChamberHero({
  project,
  concept,
  reducedMotion,
  previewMode = 'site',
}: ChamberHeroProps) {
  const cta = resolveCtaTarget(project);
  const heroId = heroMediaId(concept);
  const { asset, url } = useRendererAsset(project, heroId);
  const logo = useRendererAsset(project, slotId(concept, SLOTS.logoMain));
  const claim = project.brand.claim.trim();
  const description = project.about.description.trim();
  const sub = claim || description;
  const brand = project.brand.name.trim();
  const showWorld = !reducedMotion && isWebGLAvailable();
  const mediaKind = asset?.kind === 'video' ? 'video' : asset ? 'image' : null;
  const immersive = previewMode === 'fullscreen' || previewMode === 'site';

  if (!isSectionEnabled(concept, 'hero')) return null;

  return (
    <header className={styles.hero}>
      <div className={styles.volume} data-chamber-media>
        {showWorld ? (
          <Suspense
            fallback={
              <div className={styles.fallback} aria-hidden="true">
                <CampaignStill still={CAMPAIGN.chamber.architecture} eager />
              </div>
            }
          >
            <ChamberVoid
              logoUrl={logo.url}
              brandName={brand}
              mediaUrl={url}
              mediaKind={mediaKind}
              immersive={immersive}
              environmentUrl={CAMPAIGN.chamber.architecture.jpg}
            />
          </Suspense>
        ) : (
          <div className={styles.fallback} aria-hidden="true">
            <CampaignStill still={CAMPAIGN.chamber.architecture} eager />
          </div>
        )}
      </div>
      <p className={styles.kicker} data-chamber-reveal>
        {de.gallery.names.chamber}
      </p>
      <div className={styles.spatialMark}>
        <BrandMark
          project={project}
          concept={concept}
          tone="chamber"
          reducedMotion={reducedMotion}
          variant="spatial"
        />
      </div>
      {sub ? (
        <p className={styles.caption} data-chamber-reveal>
          {sub}
        </p>
      ) : null}
      {cta.renderable && cta.href ? (
        <a className={styles.cta} href={cta.href} data-chamber-reveal data-cursor="enter">
          {cta.label ?? de.wizard.ctaIntents[project.cta.intent]}
        </a>
      ) : null}
    </header>
  );
}
