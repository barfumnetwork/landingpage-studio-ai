export async function playSignalIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from('[data-signal-reveal]', {
      opacity: 0,
      y: 10,
      duration: 0.72,
      stagger: 0.06,
      ease: 'power2.out',
    });
    gsap.fromTo(
      '[data-signal-media]',
      { clipPath: 'inset(0 0 100% 0)', opacity: 0.72 },
      {
        clipPath: 'inset(0 0 0% 0)',
        opacity: 1,
        duration: 1.05,
        ease: 'power2.out',
      },
    );
  }, root);
  return () => ctx.revert();
}
