import { MOTION } from '../../motion/easing';
import {
  playCinematicIntro,
  playMediaParallax,
  playNavShrink,
  playScrollReveal,
} from '../../motion/playMotion';

export async function playImprintIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const chars = root.querySelectorAll('[data-imprint-char]');
  const intro = await playCinematicIntro(
    root,
    '[data-imprint-reveal]',
    '[data-imprint-media]',
  );
  const ctx = gsap.context(() => {
    if (chars.length > 0) {
      gsap.from(chars, {
        opacity: 0,
        yPercent: 28,
        rotateX: 18,
        duration: 1.15,
        stagger: 0.028,
        ease: MOTION.easeOut,
      });
    }
  }, root);
  const scroll = await playScrollReveal(root, 'section');
  const parallax = await playMediaParallax(root, '[data-imprint-media]');
  const nav = await playNavShrink(root, 'nav');
  return () => {
    intro();
    ctx.revert();
    scroll();
    parallax();
    nav();
  };
}
