import type { Project } from '../types/project';
import { collectBlobKeysFromAssets } from '../utils/assetMedia';

export function collectProjectBlobKeys(project: Project): string[] {
  return collectBlobKeysFromAssets([
    project.logo.original,
    project.logo.transparent,
    ...project.media.images,
    ...project.media.videos,
  ]);
}
