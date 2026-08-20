export function readScrollProgress(node: HTMLElement): number {
  const scroller = node.closest('[data-preview-scroller]');
  if (scroller instanceof HTMLElement) {
    const span = scroller.scrollHeight - scroller.clientHeight;
    if (span <= 1) return 0;
    return Math.min(1, Math.max(0, scroller.scrollTop / span));
  }
  const span = document.documentElement.scrollHeight - window.innerHeight;
  if (span <= 1) return 0;
  return Math.min(1, Math.max(0, window.scrollY / span));
}
