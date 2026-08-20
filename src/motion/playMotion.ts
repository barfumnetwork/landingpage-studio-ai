import { MOTION, resolveScroller } from './easing';

export async function playCinematicIntro(
  root: HTMLElement,
  revealSelector: string,
  mediaSelector: string,
): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from(revealSelector, {
      opacity: 0,
      y: MOTION.y,
      duration: MOTION.durationIn,
      stagger: MOTION.stagger,
      ease: MOTION.easeOut,
    });
    const media = root.querySelectorAll(mediaSelector);
    if (media.length > 0) {
      gsap.fromTo(
        media,
        { opacity: 0.72, scale: 1.06, filter: 'blur(8px)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: MOTION.durationMedia,
          ease: MOTION.easeSoft,
        },
      );
    }
  }, root);
  return () => ctx.revert();
}

export async function playScrollReveal(
  root: HTMLElement,
  selector: string,
): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  const scroller = resolveScroller(root);
  const ctx = gsap.context(() => {
    const nodes = gsap.utils.toArray<HTMLElement>(selector);
    for (const node of nodes) {
      gsap.from(node, {
        opacity: 0,
        y: 36,
        duration: 1.1,
        ease: MOTION.easeOut,
        scrollTrigger: {
          trigger: node,
          scroller,
          start: 'top 90%',
          once: true,
        },
      });
    }
  }, root);
  return () => {
    ctx.revert();
    ScrollTrigger.getAll().forEach((item) => {
      if (item.trigger && root.contains(item.trigger)) item.kill();
    });
  };
}

export async function playNavShrink(
  root: HTMLElement,
  navSelector: string,
): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  const nav = root.querySelector(navSelector);
  if (!(nav instanceof HTMLElement)) return () => undefined;
  const scroller = resolveScroller(root);
  const trigger = ScrollTrigger.create({
    trigger: root,
    scroller,
    start: 'top top',
    end: '+=120',
    onUpdate: (self) => {
      nav.dataset.compact = self.progress > 0.4 ? 'true' : 'false';
    },
  });
  return () => trigger.kill();
}

export async function playMediaParallax(
  root: HTMLElement,
  selector: string,
): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  const scroller = resolveScroller(root);
  const ctx = gsap.context(() => {
    const nodes = gsap.utils.toArray<HTMLElement>(selector);
    for (const node of nodes) {
      const media = node.querySelector('img, video, canvas') ?? node;
      gsap.fromTo(
        media,
        { yPercent: -7, scale: 1.08 },
        {
          yPercent: 7,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: node,
            scroller,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.7,
          },
        },
      );
    }
  }, root);
  return () => {
    ctx.revert();
    ScrollTrigger.getAll().forEach((item) => {
      if (item.trigger && root.contains(item.trigger)) item.kill();
    });
  };
}
