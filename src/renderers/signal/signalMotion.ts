import {
  playDirectedIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
  playSignalBrand,
} from '../../motion/playMotion';

export async function playSignalIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playDirectedIntro(
    root,
    '[data-signal-reveal]',
    '[data-signal-media]',
    'signal',
  );
  const brand = await playSignalBrand(root);
  const scroll = await playScrollReveal(root, 'section');
  const parallax = await playMediaParallax(root, '[data-signal-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    brand();
    scroll();
    parallax();
    nav();
  };
}
