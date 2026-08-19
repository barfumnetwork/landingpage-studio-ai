export async function playAtelierIntro(root: HTMLElement): Promise<() => void> {
  const { default: gsap } = await import('gsap');
  const ctx = gsap.context(() => {
    gsap.from('[data-atelier-reveal]', {
      opacity: 0,
      y: 16,
      duration: 1.05,
      stagger: 0.1,
      ease: 'power2.out',
    });
    gsap.fromTo(
      '[data-atelier-media]',
      { clipPath: 'inset(16% 10% 16% 10%)', scale: 1.06 },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        duration: 1.45,
        ease: 'power2.out',
      },
    );
  }, root);
  return () => ctx.revert();
}
