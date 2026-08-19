export async function playReelIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from('[data-reel-reveal]', {
      opacity: 0,
      y: 22,
      duration: 1.15,
      stagger: 0.1,
      ease: 'power2.out',
    });
    gsap.fromTo(
      '[data-reel-media]',
      { scale: 1.08, clipPath: 'inset(8% 0 8% 0)' },
      {
        scale: 1,
        clipPath: 'inset(0% 0 0% 0)',
        duration: 1.7,
        ease: 'power2.out',
      },
    );
  }, root);
  return () => ctx.revert();
}
