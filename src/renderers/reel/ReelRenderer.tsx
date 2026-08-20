import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';
import { isSectionEnabled } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
import { onPreviewHashClick, rendererPageClass } from '../shared/previewNavigate';
import type { ConceptRendererProps } from '../types';
import { playReelIntro } from './reelMotion';
import { ReelHero } from './ReelHero';
import {
  ReelAbout,
  ReelContact,
  ReelCta,
  ReelFooter,
  ReelGallery,
  ReelServices,
  ReelStory,
  ReelTeam,
  ReelVideo,
} from './ReelSections';
import styles from './ReelRenderer.module.css';

const NAV_ITEMS = [
  { section: 'about', href: '#about', label: de.renderer.reelNav.about },
  { section: 'gallery', href: '#gallery', label: de.renderer.reelNav.work },
  { section: 'services', href: '#services', label: de.renderer.reelNav.services },
  { section: 'video', href: '#video', label: de.renderer.reelNav.video },
  { section: 'team', href: '#team', label: de.renderer.reelNav.team },
  { section: 'contact', href: '#contact', label: de.renderer.reelNav.contact },
] as const;

export default function ReelRenderer({
  project,
  concept,
  previewMode,
  reducedMotion: reducedOverride,
}: ConceptRendererProps) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion(reducedOverride);
  const links = NAV_ITEMS.filter((item) => isSectionEnabled(concept, item.section));
  const showNav = isSectionEnabled(concept, 'nav');

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    let revert: (() => void) | undefined;
    let active = true;
    void playReelIntro(root).then((fn) => {
      if (!active) {
        fn();
        return;
      }
      revert = fn;
    });
    return () => {
      active = false;
      revert?.();
    };
  }, [reducedMotion, concept.seed]);

  return (
    <article
      ref={rootRef}
      className={rendererPageClass(styles.page, styles.full, previewMode)}
      id="top"
      onClick={(event) => onPreviewHashClick(event, rootRef.current, previewMode)}
    >
      {showNav ? (
        <nav className={styles.nav} aria-label={project.brand.name.trim()} data-nav="">
          <a className={styles.brand} href="#top">
            {project.brand.name.trim()}
          </a>
          {previewMode === 'site' && links.length > 0 ? (
            <ul className={styles.links}>
              {links.map((item) => (
                <li key={item.section}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
      ) : null}
      <ReelHero project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelAbout project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelGallery project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelVideo project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelServices project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelStory project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelTeam project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelCta project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelContact project={project} concept={concept} reducedMotion={reducedMotion} />
      <ReelFooter project={project} concept={concept} reducedMotion={reducedMotion} />
    </article>
  );
}
