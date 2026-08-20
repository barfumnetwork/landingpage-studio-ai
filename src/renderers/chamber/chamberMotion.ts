import { playDirectedIntro, playNavShrink, playScrollReveal } from '../../motion/playMotion';

export async function playChamberIntro(root: HTMLElement): Promise<() => void> {
  const intro = await playDirectedIntro(
    root,
    '[data-chamber-reveal]',
    '[data-chamber-media]',
    'chamber',
  );
  const scroll = await playScrollReveal(root, 'section');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    scroll();
    nav();
  };
}
