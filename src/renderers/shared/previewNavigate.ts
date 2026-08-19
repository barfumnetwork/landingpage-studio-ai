import type { MouseEvent } from 'react';
import type { PreviewMode } from '../types';

export function isFullPreview(mode: PreviewMode): boolean {
  return mode !== 'modal';
}

export function rendererPageClass(page: string, full: string, mode: PreviewMode): string {
  return isFullPreview(mode) ? `${page} ${full}` : page;
}

export function onPreviewHashClick(
  event: MouseEvent<HTMLElement>,
  root: HTMLElement | null,
  mode: PreviewMode,
): void {
  if (mode === 'site') return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || !href.startsWith('#') || href.length < 2) return;
  const node = root?.querySelector(`#${CSS.escape(href.slice(1))}`);
  if (!(node instanceof HTMLElement)) return;
  event.preventDefault();
  node.scrollIntoView({ block: 'start' });
}
