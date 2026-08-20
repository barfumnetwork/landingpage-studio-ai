import { de } from '../../i18n/de';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { AssetPreviewFrame } from '../preview/AssetPreviewFrame';
import {
  enabledSections,
  findProjectAsset,
  slotAssetId,
} from '../preview/previewData';
import styles from './StructuralPreview.module.css';

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
  const sections = enabledSections(concept);
  const heroId = slotAssetId(concept, 'IMAGE_HERO') ?? slotAssetId(concept, 'VIDEO_HERO');
  const videoId = slotAssetId(concept, 'VIDEO_HERO');
  const hero = findProjectAsset(project, heroId);
  const video = findProjectAsset(project, videoId);
  const brand = project.brand.name.trim();
  const media = concept.id === 'reel' && video ? video : hero;
  const play = concept.id === 'reel' && Boolean(video) && playVideo;

  return (
    <div
      className={`${styles.preview} ${CONCEPT_CLASS[concept.id]} ${compact ? styles.compact : ''}`}
    >
      <div className={styles.stage}>
        <div className={styles.hero}>
          {media ? (
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
        <p className={styles.brand}>{brand}</p>
        {project.brand.claim.trim() ? (
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
