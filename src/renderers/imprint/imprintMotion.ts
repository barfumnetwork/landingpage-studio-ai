import {
  playBrandScroll,
  playDirectedIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
} from '../../motion/playMotion';

export async function playImprintIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playDirectedIntro(
    root,
    '[data-imprint-reveal]',
    '[data-imprint-media]',
    'imprint',
  );
  const brand = await playBrandScroll(root);
  const scroll = await playScrollReveal(root, 'section');
  const parallax = await playMediaParallax(root, '[data-imprint-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    brand();
    scroll();
    parallax();
    nav();
  };
}
