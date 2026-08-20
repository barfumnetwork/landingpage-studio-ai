export const MOTION = {
  easeOut: 'power3.out',
  easeSoft: 'power2.out',
  easeInOut: 'power2.inOut',
  durationIn: 1.05,
  durationMedia: 1.45,
  durationSlow: 1.7,
  stagger: 0.07,
  y: 22,
} as const;

export function resolveScroller(root: HTMLElement): HTMLElement | Window {
  const scroller = root.closest('[data-preview-scroller]');
  if (scroller instanceof HTMLElement) return scroller;
  return window;
}
