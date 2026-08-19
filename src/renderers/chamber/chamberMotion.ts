export async function playChamberIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from('[data-chamber-reveal]', {
      opacity: 0,
      y: 12,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power2.out',
    });
    gsap.from('[data-chamber-media]', {
      opacity: 0,
      scale: 1.04,
      duration: 1.2,
      ease: 'power2.out',
      transformOrigin: 'center center',
    });
  }, root);
  return () => ctx.revert();
}
