export async function playImprintIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from('[data-imprint-reveal]', {
      opacity: 0,
      y: 18,
      duration: 0.88,
      stagger: 0.08,
      ease: 'power2.out',
    });
    gsap.from('[data-imprint-media]', {
      opacity: 0,
      y: 24,
      duration: 1.05,
      ease: 'power2.out',
      delay: 0.12,
    });
  }, root);
  return () => ctx.revert();
}
