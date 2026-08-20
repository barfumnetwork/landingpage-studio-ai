import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';
import { isSectionEnabled } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
import { onPreviewHashClick, rendererPageClass } from '../shared/previewNavigate';
import type { ConceptRendererProps } from '../types';
import { playAtelierIntro } from './atelierMotion';
import { AtelierHero } from './AtelierHero';
import {
  AtelierAbout,
  AtelierContact,
  AtelierCta,
  AtelierFooter,
  AtelierGallery,
  AtelierServices,
  AtelierStory,
  AtelierTeam,
  AtelierVideo,
} from './AtelierSections';
import styles from './AtelierRenderer.module.css';

const NAV_ITEMS = [
  { section: 'about', href: '#about', label: de.renderer.atelierNav.about },
  { section: 'gallery', href: '#gallery', label: de.renderer.atelierNav.work },
  { section: 'services', href: '#services', label: de.renderer.atelierNav.services },
  { section: 'contact', href: '#contact', label: de.renderer.atelierNav.contact },
] as const;

export default function AtelierRenderer({
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
    void playAtelierIntro(root).then((fn) => {
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
      <AtelierHero project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierAbout project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierServices
        project={project}
        concept={concept}
        reducedMotion={reducedMotion}
      />
      <AtelierGallery project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierVideo project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierStory project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierTeam project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierCta project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierContact project={project} concept={concept} reducedMotion={reducedMotion} />
      <AtelierFooter project={project} concept={concept} reducedMotion={reducedMotion} />
    </article>
  );
}
