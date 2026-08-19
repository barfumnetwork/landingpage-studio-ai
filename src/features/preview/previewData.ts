import type { AssetFile, GeneratedConcept, Project } from '../../types/project';

export function findProjectAsset(
  project: Project,
  assetId: string | null,
): AssetFile | null {
  if (!assetId) return null;
  if (project.logo.original?.id === assetId) return project.logo.original;
  if (project.logo.transparent?.id === assetId) return project.logo.transparent;
  const image = project.media.images.find((item) => item.id === assetId);
  if (image) return image;
  return project.media.videos.find((item) => item.id === assetId) ?? null;
}

export function slotAssetId(concept: GeneratedConcept, slot: string): string | null {
  return concept.assetMap.find((item) => item.slot === slot)?.assetId ?? null;
}

export function enabledSections(concept: GeneratedConcept): string[] {
  return concept.sectionPlan.filter((item) => item.enabled).map((item) => item.section);
}

export function validServiceCount(project: Project): number {
  return project.services.filter((item) => item.name.trim().length > 0).length;
}
