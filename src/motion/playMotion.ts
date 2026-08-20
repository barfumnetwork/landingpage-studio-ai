import { MOTION, resolveScroller } from './easing';

export type IntroVariant = 'chamber' | 'atelier' | 'signal' | 'reel' | 'imprint';

export async function playDirectedIntro(
  root: HTMLElement,
  revealSelector: string,
  mediaSelector: string,
  variant: IntroVariant,
): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    const nav = root.querySelector('nav');
    const brand = root.querySelector('[data-brand-mark]');
    const media = root.querySelectorAll(mediaSelector);
    const reveals = root.querySelectorAll(revealSelector);
    const chars = root.querySelectorAll('[data-kinetic-char]');
    const bars = root.querySelectorAll('[data-reel-bar]');

    if (nav instanceof HTMLElement) {
      gsap.set(nav, { autoAlpha: 0, y: -10 });
    }

    const tl = gsap.timeline({ defaults: { ease: MOTION.easeOut } });

    if (variant === 'chamber') {
      // Camera journey owns the open. Do not blur/clip the WebGL canvas.
      if (brand) {
        tl.fromTo(
          brand,
          { clipPath: 'inset(100% 0 0 0)', yPercent: 16, filter: 'blur(12px)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            yPercent: 0,
            filter: 'blur(0px)',
            duration: 1.28,
          },
          0,
        );
      }
    } else if (variant === 'atelier') {
      if (media.length > 0) {
        tl.fromTo(
          media,
          { clipPath: 'inset(0 0 100% 0)', scale: 1.1 },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            scale: 1,
            duration: 1.55,
            ease: MOTION.easeSoft,
          },
        );
      }
      if (brand) {
        tl.fromTo(
          brand,
          { xPercent: -10, clipPath: 'inset(0 32% 0 0)', filter: 'blur(8px)' },
          {
            xPercent: 0,
            clipPath: 'inset(0% 0% 0% 0%)',
            filter: 'blur(0px)',
            duration: 1.32,
          },
          '-=0.95',
        );
      }
    } else if (variant === 'signal') {
      if (media.length > 0) {
        tl.fromTo(
          media,
          { scale: 1.2, filter: 'contrast(1.45) blur(12px)' },
          {
            scale: 1,
            filter: 'contrast(1) blur(0px)',
            duration: 1.42,
            ease: MOTION.easeSoft,
          },
        );
      }
      if (chars.length > 0) {
        tl.fromTo(
          chars,
          { yPercent: 42, opacity: 0, rotateX: 26 },
          { yPercent: 0, opacity: 1, rotateX: 0, duration: 0.92, stagger: 0.02 },
          '-=0.72',
        );
      } else if (brand) {
        tl.fromTo(
          brand,
          { skewX: 10, xPercent: -6 },
          { skewX: 0, xPercent: 0, duration: 1.08 },
          '-=0.55',
        );
      }
    } else if (variant === 'reel') {
      if (bars.length > 0) {
        tl.fromTo(
          bars,
          { scaleY: 2.1 },
          { scaleY: 1, duration: 1.18, ease: MOTION.easeSoft },
        );
      }
      if (media.length > 0) {
        tl.fromTo(
          media,
          { scale: 1.18, clipPath: 'inset(16% 0%)' },
          {
            scale: 1,
            clipPath: 'inset(0% 0%)',
            duration: 1.62,
            ease: MOTION.easeSoft,
          },
          0.12,
        );
      }
      if (brand) {
        tl.fromTo(
          brand,
          { yPercent: 22, filter: 'blur(16px)', opacity: 0.15 },
          { yPercent: 0, filter: 'blur(0px)', opacity: 1, duration: 1.22 },
          '-=0.88',
        );
      }
    } else if (chars.length > 0) {
      tl.fromTo(
        chars,
        { yPercent: 38, rotateX: 22, opacity: 0 },
        { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.18, stagger: 0.026 },
      );
      if (media.length > 0) {
        tl.fromTo(
          media,
          { clipPath: 'inset(14% 20%)', opacity: 0.18 },
          {
            clipPath: 'inset(0% 0%)',
            opacity: 1,
            duration: 1.32,
            ease: MOTION.easeSoft,
          },
          '-=0.72',
        );
      }
    } else if (brand) {
      tl.fromTo(
        brand,
        { yPercent: 16, filter: 'blur(10px)' },
        { yPercent: 0, filter: 'blur(0px)', duration: 1.12 },
      );
    }

    if (reveals.length > 0) {
      tl.fromTo(
        reveals,
        { yPercent: 20, filter: 'blur(8px)' },
        {
          yPercent: 0,
          filter: 'blur(0px)',
          duration: 0.95,
          stagger: MOTION.stagger,
        },
        '-=0.52',
      );
    }
    if (nav instanceof HTMLElement) {
      const navAt = variant === 'chamber' || variant === 'signal' ? '+=0.35' : '+=0.08';
      tl.to(nav, { autoAlpha: 1, y: 0, duration: 0.82, ease: MOTION.easeSoft }, navAt);
    }
  }, root);
  return () => ctx.revert();
}

export async function playBrandScroll(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const { ScrollTrigger } = await import('gsap/ScrollTrigger');
  gsap.registerPlugin(ScrollTrigger);
  const mark = root.querySelector('[data-brand-mark]');
  if (!(mark instanceof HTMLElement)) return () => undefined;
  const scroller = resolveScroller(root);
  gsap.set(mark, { transformOrigin: 'left top' });
  const tween = gsap.fromTo(
    mark,
    { scale: 1, xPercent: 0 },
    {
      scale: 0.58,
      xPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: mark,
        scroller,
        start: 'top 22%',
        end: '+=80%',
        scrub: 0.75,
      },
    },
  );
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

export async function playSignalBrand(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const mark = root.querySelector('[data-brand-mark]');
  if (!(mark instanceof HTMLElement)) return () => undefined;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!fine) return () => undefined;
  const xTo = gsap.quickTo(mark, 'x', { duration: 0.72, ease: 'power3.out' });
  const yTo = gsap.quickTo(mark, 'y', { duration: 0.72, ease: 'power3.out' });
  const skewTo = gsap.quickTo(mark, 'skewX', { duration: 0.72, ease: 'power3.out' });

  function onMove(event: PointerEvent): void {
    const rect = root.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
    const ny = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
    xTo(nx * 32);
    yTo(ny * 16);
    skewTo(nx * -7);
  }

  function onLeave(): void {
    xTo(0);
    yTo(0);
    skewTo(0);
  }

  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);
  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    gsap.set(mark, { clearProps: 'transform' });
  };
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
        y: 48,
        clipPath: 'inset(8% 0 12% 0)',
        filter: 'blur(8px)',
        duration: 1.25,
        ease: MOTION.easeOut,
        scrollTrigger: {
          trigger: node,
          scroller,
          start: 'top 88%',
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
    end: '+=160',
    onUpdate: (self) => {
      nav.dataset.compact = self.progress > 0.28 ? 'true' : 'false';
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
        { yPercent: -12, scale: 1.16 },
        {
          yPercent: 10,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: node,
            scroller,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.85,
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
