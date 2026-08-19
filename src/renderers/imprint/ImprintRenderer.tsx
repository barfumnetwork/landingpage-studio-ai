import { useEffect, useRef, type MouseEvent } from 'react';
import { de } from '../../i18n/de';
import { SLOTS } from '../../generator/schema/ids';
import { useRendererAsset } from '../shared/useRendererAsset';
import { isSectionEnabled, slotId } from '../shared/sectionPlan';
import { useReducedMotion } from '../shared/useReducedMotion';
import type { ConceptRendererProps } from '../types';
import { playImprintIntro } from './imprintMotion';
import { ImprintHero } from './ImprintHero';
import {
  ImprintAbout,
  ImprintContact,
  ImprintCta,
  ImprintFooter,
  ImprintGallery,
  ImprintServices,
  ImprintStory,
  ImprintTeam,
  ImprintVideo,
} from './ImprintSections';
import styles from './ImprintRenderer.module.css';

const NAV_ITEMS = [
  { section: 'about', href: '#about', label: de.renderer.imprintNav.about },
  { section: 'gallery', href: '#gallery', label: de.renderer.imprintNav.work },
  { section: 'services', href: '#services', label: de.renderer.imprintNav.services },
  { section: 'video', href: '#video', label: de.renderer.imprintNav.video },
  { section: 'team', href: '#team', label: de.renderer.imprintNav.team },
  { section: 'contact', href: '#contact', label: de.renderer.imprintNav.contact },
] as const;

export default function ImprintRenderer({
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
    void playImprintIntro(root).then((fn) => {
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
      <ImprintHero project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintAbout project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintGallery project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintServices
        project={project}
        concept={concept}
        reducedMotion={reducedMotion}
      />
      <ImprintVideo project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintStory project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintTeam project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintCta project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintContact project={project} concept={concept} reducedMotion={reducedMotion} />
      <ImprintFooter project={project} concept={concept} reducedMotion={reducedMotion} />
    </article>
  );
}
