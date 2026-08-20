import { lazy, Suspense } from 'react';
import { de } from '../../i18n/de';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { isWebGLAvailable } from '../../renderers/shared/webgl';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import { useAssetObjectUrl } from '../assets/useAssetObjectUrl';
import { AssetPreviewFrame } from '../preview/AssetPreviewFrame';
import {
  enabledSections,
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
}: StructuralPreviewProps) {
  const reduced = useReducedMotion();
  const sections = enabledSections(concept);
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
            <Suspense fallback={<div className={styles.atmosphere} aria-hidden="true" />}>
              <ChamberVoid
                logoUrl={logoUrl}
                brandName={brand}
                mediaUrl={hero?.kind === 'video' ? null : heroUrl}
                mediaKind={hero && hero.kind !== 'video' ? 'image' : null}
                compact
              />
            </Suspense>
          ) : live && concept.id === 'signal' ? (
            <Suspense fallback={<div className={styles.atmosphere} aria-hidden="true" />}>
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
          ) : (
            <div className={styles.atmosphere} aria-hidden="true" />
          )}
        </div>
        {concept.id !== 'chamber' && logoUrl ? (
          <img className={styles.logo} src={logoUrl} alt="" />
        ) : null}
        {concept.id !== 'chamber' ? <p className={styles.brand}>{brand}</p> : null}
        {project.brand.claim.trim() && concept.id !== 'chamber' && concept.id !== 'reel' ? (
          <p className={styles.claim}>{project.brand.claim.trim()}</p>
        ) : null}
        <span className={styles.rhythm} aria-hidden="true">
          {sections.slice(0, 4).map((section) => (
            <i key={section} />
          ))}
        </span>
      </div>
      {updating ? (
        <div className={styles.updating} role="status">
          {de.gallery.updating}
        </div>
      ) : null}
    </div>
  );
}
