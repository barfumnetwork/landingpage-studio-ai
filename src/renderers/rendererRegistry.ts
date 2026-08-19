import type { ConceptId } from '../types/project';
import type { RendererLoader } from './types';

export const FINAL_RENDERER_LOADERS: Partial<Record<ConceptId, RendererLoader>> = {
  chamber: () => import('./chamber/ChamberRenderer'),
  atelier: () => import('./atelier/AtelierRenderer'),
};

export function hasFinalRenderer(id: ConceptId): boolean {
  return FINAL_RENDERER_LOADERS[id] !== undefined;
}
