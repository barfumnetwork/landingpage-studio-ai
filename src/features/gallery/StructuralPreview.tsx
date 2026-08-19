import { resolveCtaTarget } from '../../generator';
import { de } from '../../i18n/de';
import type { ConceptId, GeneratedConcept, Project } from '../../types/project';
import { AssetPreviewFrame } from '../preview/AssetPreviewFrame';
import {
  enabledSections,
  findProjectAsset,
  slotAssetId,
  validServiceCount,
} from '../preview/previewData';
import { SectionPreview } from '../preview/SectionPreview';
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
  const heroId = slotAssetId(concept, 'IMAGE_HERO');
  const aboutId = slotAssetId(concept, 'IMAGE_ABOUT');
  const videoId = slotAssetId(concept, 'VIDEO_HERO');
  const hero = findProjectAsset(project, heroId);
  const about = findProjectAsset(project, aboutId);
  const video = findProjectAsset(project, videoId);
  const cta = resolveCtaTarget(project);
  const services = validServiceCount(project);
  const hasGallery = sections.includes('gallery');
  const hasVideo = sections.includes('video') && videoId !== null;
  const hasContact = sections.includes('contact');
  const brand = project.brand.name.trim() || de.gallery.names[concept.id];

  return (
    <div
      className={`${styles.preview} ${CONCEPT_CLASS[concept.id]} ${compact ? styles.compact : ''}`}
    >
      <div className={styles.stage}>
        <p className={styles.brand}>{brand}</p>
        {project.brand.claim.trim() ? (
          <p className={styles.claim}>{project.brand.claim.trim()}</p>
        ) : null}
        <div className={styles.hero}>
          <AssetPreviewFrame
            asset={hero}
            load={loadMedia}
            playVideo={false}
            alt={hero ? `${de.gallery.names[concept.id]} Hero` : de.gallery.placeholder}
          />
        </div>
        {concept.id === 'reel' && hasVideo ? (
          <div className={styles.letterbox}>
            <AssetPreviewFrame
              asset={video}
              load={loadMedia}
              playVideo={playVideo}
              alt={de.gallery.videoHint}
            />
          </div>
        ) : null}
        {concept.id !== 'reel' && about && aboutId !== heroId ? (
          <div className={styles.aside}>
            <AssetPreviewFrame
              asset={about}
              load={loadMedia}
              playVideo={false}
              alt={`${de.gallery.names[concept.id]} About`}
            />
          </div>
        ) : null}
        <div className={styles.dots} aria-hidden="true">
          {sections.slice(0, 6).map((section) => (
            <span key={section} className={styles.dot} />
          ))}
        </div>
      </div>
      <div className={styles.meta}>
        <SectionPreview sections={sections} />
        <dl className={styles.facts}>
          {heroId ? (
            <div className={styles.fact}>
              <dt>HERO</dt>
              <dd>{heroId}</dd>
            </div>
          ) : null}
          {aboutId ? (
            <div className={styles.fact}>
              <dt>ABOUT</dt>
              <dd>{aboutId}</dd>
            </div>
          ) : null}
          {hasVideo ? (
            <div className={styles.fact}>
              <dt>VIDEO</dt>
              <dd>{videoId}</dd>
            </div>
          ) : null}
          {sections.includes('services') ? (
            <div className={styles.fact}>
              <dt>SERVICES</dt>
              <dd>{String(services)}</dd>
            </div>
          ) : null}
          {hasGallery ? (
            <div className={styles.fact}>
              <dt>GALLERY</dt>
              <dd>{de.wizard.present}</dd>
            </div>
          ) : null}
          {hasContact ? (
            <div className={styles.fact}>
              <dt>CONTACT</dt>
              <dd>{de.wizard.present}</dd>
            </div>
          ) : null}
          {cta.renderable ? (
            <div className={styles.fact}>
              <dt>CTA</dt>
              <dd>{cta.label ?? project.cta.intent}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      {updating ? (
        <div className={styles.updating} role="status">
          {de.gallery.updating}
        </div>
      ) : null}
    </div>
  );
}
