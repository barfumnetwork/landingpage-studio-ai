import type { ComponentType } from 'react';
import type { ConceptId, GeneratedConcept, Project } from '../types/project';

export type PreviewMode = 'modal' | 'fullscreen' | 'site';

export interface ConceptRendererProps {
  project: Project;
  concept: GeneratedConcept;
  selectedConceptId: ConceptId | null;
  previewMode: PreviewMode;
  reducedMotion?: boolean;
  onClose?: () => void;
}

export type ConceptRendererComponent = ComponentType<ConceptRendererProps>;

export type RendererLoader = () => Promise<{ default: ConceptRendererComponent }>;
