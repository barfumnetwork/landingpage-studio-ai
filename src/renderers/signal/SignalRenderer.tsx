import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';
import { SLOTS } from '../../generator/schema/ids';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isSectionEnabled, slotId } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
import { onPreviewHashClick, rendererPageClass } from '../shared/previewNavigate';
import type { ConceptRendererProps } from '../types';
import { playSignalIntro } from './signalMotion';
import { SignalHero } from './SignalHero';
import {
  SignalAbout,
  SignalContact,
  SignalCta,
  SignalFooter,
  SignalGallery,
  SignalServices,
  SignalStory,
  SignalTeam,
  SignalVideo,
} from './SignalSections';
import styles from './SignalRenderer.module.css';

const NAV_ITEMS = [
  { section: 'about', href: '#about', label: de.renderer.signalNav.about },
  { section: 'services', href: '#services', label: de.renderer.signalNav.services },
  { section: 'gallery', href: '#gallery', label: de.renderer.signalNav.work },
  { section: 'video', href: '#video', label: de.renderer.signalNav.video },
  { section: 'team', href: '#team', label: de.renderer.signalNav.team },
  { section: 'contact', href: '#contact', label: de.renderer.signalNav.contact },
] as const;

export default function SignalRenderer({
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
    void playSignalIntro(root).then((fn) => {
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
      <SignalHero project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalAbout project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalServices project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalGallery project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalVideo project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalStory project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalTeam project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalCta project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalContact project={project} concept={concept} reducedMotion={reducedMotion} />
      <SignalFooter project={project} concept={concept} reducedMotion={reducedMotion} />
    </article>
  );
}
