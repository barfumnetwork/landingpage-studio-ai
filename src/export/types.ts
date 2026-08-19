import type { ConceptId, Project } from '../types/project';

export interface SitePayload {
  project: Project;
  conceptId: ConceptId;
  media: Record<string, string>;
}

export interface ExportManifest {
  html: string;
  files: string[];
}

declare global {
  interface Window {
    __LPS_SITE__?: SitePayload;
  }
}
