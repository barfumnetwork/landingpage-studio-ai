import {
  playCinematicIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
} from '../../motion/playMotion';

export async function playReelIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playCinematicIntro(root, '[data-reel-reveal]', '[data-reel-media]');
  const scroll = await playScrollReveal(root, 'section');
  const parallax = await playMediaParallax(root, '[data-reel-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    scroll();
    parallax();
    nav();
  };
}
