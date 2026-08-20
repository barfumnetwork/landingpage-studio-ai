import {
  playDirectedIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
} from '../../motion/playMotion';

export async function playAtelierIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playDirectedIntro(
    root,
    '[data-atelier-reveal]',
    '[data-atelier-media]',
    'atelier',
  );
  const scroll = await playScrollReveal(root, 'section, [data-atelier-media]');
  const parallax = await playMediaParallax(root, '[data-atelier-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    scroll();
    parallax();
    nav();
  };
}
