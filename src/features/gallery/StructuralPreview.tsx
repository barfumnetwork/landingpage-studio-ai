import { lazy, Suspense } from 'react';
import { de } from '../../i18n/de';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { isWebGLAvailable } from '../../renderers/shared/webgl';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import { CampaignStill } from '../../renderers/shared/CampaignStill';
import { CAMPAIGN } from '../../renderers/shared/campaignAssets';
import { useAssetObjectUrl } from '../assets/useAssetObjectUrl';
import { AssetPreviewFrame } from '../preview/AssetPreviewFrame';
import {
  findProjectAsset,
  slotAssetId,
} from '../preview/previewData';
import styles from './StructuralPreview.module.css';

const ChamberVoid = lazy(() => import('../../renderers/chamber/ChamberVoid'));
const SignalField = lazy(() => import('../../renderers/signal/SignalField'));

interface StructuralPreviewProps {
  project: Project;
  concept: GeneratedConcept;
  loadMedia: boolean;
  playVideo: boolean;
  updating?: boolean;
  compact?: boolean;
  liveWebGL?: boolean;
}

const CONCEPT_CLASS: Record<ConceptId, string> = {
  chamber: styles.chamber,
  atelier: styles.atelier,
  signal: styles.signal,
  reel: styles.reel,
  imprint: styles.imprint,
};

export function StructuralPreview({
  project,
  concept,
  loadMedia,
  playVideo,
  updating = false,
  compact = false,
  liveWebGL = true,
}: StructuralPreviewProps) {
  const reduced = useReducedMotion();
  const heroId = slotAssetId(concept, 'IMAGE_HERO') ?? slotAssetId(concept, 'VIDEO_HERO');
  const videoId = slotAssetId(concept, 'VIDEO_HERO');
  const logoId = slotAssetId(concept, 'LOGO_MAIN');
  const hero = findProjectAsset(project, heroId);
  const video = findProjectAsset(project, videoId);
  const logo = findProjectAsset(project, logoId);
  const logoUrl = useAssetObjectUrl(loadMedia ? (logo?.blobKey ?? null) : null);
  const heroUrl = useAssetObjectUrl(loadMedia ? (hero?.blobKey ?? null) : null);
  const brand = project.brand.name.trim();
  const media = concept.id === 'reel' && video ? video : hero;
  const play = concept.id === 'reel' && Boolean(video) && playVideo;
  const live =
    liveWebGL &&
    loadMedia &&
    !reduced &&
    isWebGLAvailable() &&
    (concept.id === 'chamber' || concept.id === 'signal');

  return (
    <div
      className={`${styles.preview} ${CONCEPT_CLASS[concept.id]} ${compact ? styles.compact : ''}`}
    >
      <div className={styles.stage}>
        <div className={styles.hero}>
          {live && concept.id === 'chamber' ? (
            <Suspense
              fallback={
                <CampaignStill still={CAMPAIGN.chamber.architecture} className={styles.fill} />
              }
            >
              <ChamberVoid
                logoUrl={logoUrl}
                brandName={brand}
                mediaUrl={hero?.kind === 'video' ? null : heroUrl}
                mediaKind={hero && hero.kind !== 'video' ? 'image' : null}
                compact
                environmentUrl={CAMPAIGN.chamber.architecture.jpg}
              />
            </Suspense>
          ) : live && concept.id === 'signal' ? (
            <Suspense
              fallback={
                <CampaignStill still={CAMPAIGN.signal.atmosphere} className={styles.fill} />
              }
            >
              <SignalField
                imageUrl={hero?.kind === 'video' ? null : heroUrl}
                compact
              />
            </Suspense>
          ) : media ? (
            <AssetPreviewFrame
              asset={media}
              load={loadMedia}
              playVideo={play}
              alt={brand}
            />
          ) : concept.id === 'chamber' ? (
            <CampaignStill still={CAMPAIGN.chamber.architecture} className={styles.fill} />
          ) : concept.id === 'atelier' ? (
            <CampaignStill still={CAMPAIGN.atelier.figure} className={styles.fill} />
          ) : concept.id === 'signal' ? (
            <CampaignStill still={CAMPAIGN.signal.atmosphere} className={styles.fill} />
          ) : concept.id === 'reel' ? (
            <div className={styles.film} aria-hidden="true">
              <CampaignStill still={CAMPAIGN.reel.frames[0]} className={styles.frameA} />
              <CampaignStill still={CAMPAIGN.reel.frames[1]} className={styles.frameB} />
              <CampaignStill still={CAMPAIGN.reel.frames[3]} className={styles.frameC} />
            </div>
          ) : (
            <div className={styles.imprintMini} aria-hidden="true">
              <CampaignStill still={CAMPAIGN.imprint.paper} className={styles.fill} />
              <p className={styles.imprintType}>{brand || de.gallery.names.imprint}</p>
            </div>
          )}
        </div>
        {concept.id === 'atelier' && !media ? (
          <div className={styles.folio} aria-hidden="true">
            <CampaignStill still={CAMPAIGN.atelier.materials} />
          </div>
        ) : null}
        {concept.id !== 'chamber' && logoUrl ? (
          <img className={styles.logo} src={logoUrl} alt="" />
        ) : null}
        {concept.id === 'imprint' ? <p className={styles.brand}>{brand}</p> : null}
      </div>
      {updating ? (
        <div className={styles.updating} role="status">
          {de.gallery.updating}
        </div>
      ) : null}
    </div>
  );
}
