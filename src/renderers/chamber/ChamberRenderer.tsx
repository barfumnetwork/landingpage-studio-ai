import { lazy, Suspense, useRef } from 'react';
import { de } from '../../i18n/de';
import { isSectionEnabled } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
import { isWebGLAvailable } from '../shared/webgl';
import { onPreviewHashClick, rendererPageClass } from '../shared/previewNavigate';
import { CAMPAIGN } from '../shared/campaignAssets';
import { CampaignStill } from '../shared/CampaignStill';
import type { ConceptRendererProps } from '../types';
import { ChamberHero } from './ChamberHero';
import {
  ChamberAbout,
  ChamberContact,
  ChamberCta,
  ChamberFooter,
  ChamberGallery,
  ChamberServices,
  ChamberStory,
  ChamberTeam,
  ChamberVideo,
} from './ChamberSections';
import styles from './ChamberRenderer.module.css';

const ChamberVoid = lazy(() => import('./ChamberVoid'));

const NAV_ITEMS = [
  { section: 'about', href: '#about' },
  { section: 'services', href: '#services' },
  { section: 'gallery', href: '#gallery' },
  { section: 'contact', href: '#contact' },
] as const;

export default function ChamberRenderer({
  project,
  concept,
  previewMode,
  reducedMotion: reducedOverride,
}: ConceptRendererProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion(reducedOverride);
  const links = NAV_ITEMS.filter((item) => isSectionEnabled(concept, item.section));
  const showNav = isSectionEnabled(concept, 'nav');
  const immersive = previewMode === 'fullscreen' || previewMode === 'site';
  const showWorld = !reducedMotion && isWebGLAvailable();

  return (
    <article
      ref={rootRef}
      className={`${rendererPageClass(styles.page, styles.full, previewMode)} ${styles.film}`}
      id="top"
      data-chamber-film=""
      onClick={(event) => onPreviewHashClick(event, rootRef.current, previewMode)}
    >
      {showWorld ? (
        <div className={styles.world} aria-hidden="true">
          <Suspense fallback={<CampaignStill still={CAMPAIGN.chamber.architecture} />}>
            <ChamberVoid
              logoUrl={null}
              brandName=""
              immersive={immersive}
              environmentUrl={CAMPAIGN.chamber.architecture.jpg}
            />
          </Suspense>
        </div>
      ) : (
        <div className={styles.world} aria-hidden="true">
          <CampaignStill still={CAMPAIGN.chamber.architecture} />
        </div>
      )}
      {showNav ? (
        <nav className={styles.nav} aria-label={project.brand.name.trim()} data-nav="">
          <a className={styles.brand} href="#top">
            {project.brand.name.trim()}
          </a>
          {previewMode === 'site' && links.length > 0 ? (
            <ul className={styles.links}>
              {links.map((item) => (
                <li key={item.section}>
                  <a href={item.href}>{de.gallery.sectionLabels[item.section]}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      ) : null}
      <ChamberHero
        project={project}
        concept={concept}
        reducedMotion={reducedMotion}
        previewMode={previewMode}
      />
      <ChamberAbout project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberServices
        project={project}
        concept={concept}
        reducedMotion={reducedMotion}
      />
      <ChamberGallery project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberVideo project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberStory project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberTeam project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberCta project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberContact project={project} concept={concept} reducedMotion={reducedMotion} />
      <ChamberFooter project={project} concept={concept} reducedMotion={reducedMotion} />
    </article>
  );
}
