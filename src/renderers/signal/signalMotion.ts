import {
  playCinematicIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
} from '../../motion/playMotion';

export async function playSignalIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playCinematicIntro(
    root,
    '[data-signal-reveal]',
    '[data-signal-media]',
  );
  const scroll = await playScrollReveal(root, 'section');
  const parallax = await playMediaParallax(root, '[data-signal-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    scroll();
    parallax();
    nav();
  };
}
