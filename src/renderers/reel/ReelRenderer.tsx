import { useEffect, useRef, type MouseEvent } from 'react';
import { de } from '../../i18n/de';
import { SLOTS } from '../../generator/schema/ids';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isSectionEnabled, slotId } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
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
  const logo = useRendererAsset(project, slotId(concept, SLOTS.logoMain));
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

  function onPreviewNavigate(event: MouseEvent<HTMLElement>): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#') || href.length < 2) return;
    const node = rootRef.current?.querySelector(`#${CSS.escape(href.slice(1))}`);
    if (!(node instanceof HTMLElement)) return;
    event.preventDefault();
    node.scrollIntoView({ block: 'start' });
  }

  return (
    <article
      ref={rootRef}
      className={`${styles.page} ${previewMode === 'fullscreen' ? styles.full : ''}`}
      id="top"
      onClick={onPreviewNavigate}
    >
      {showNav ? (
        <nav className={styles.nav} aria-label={project.brand.name.trim()}>
          <a className={styles.brand} href="#top">
            {logo.url ? (
              <img
                className={styles.logo}
                src={logo.url}
                alt={project.brand.name.trim()}
              />
            ) : (
              project.brand.name.trim()
            )}
          </a>
          {links.length > 0 ? (
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
