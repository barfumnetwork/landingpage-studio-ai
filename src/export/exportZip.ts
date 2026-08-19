import JSZip from 'jszip';
import { CONCEPT_IDS, isCompleteConceptSet } from '../generator';
import { de } from '../i18n/de';
import type { ConceptId, Project } from '../types/project';
import { collectExportMedia } from './collectMedia';
import { downloadBlob } from './downloadBlob';
import {
  ExportUnavailableError,
  fetchExportFile,
  fetchExportManifest,
  fetchExportText,
} from './fetchManifest';
import { buildChooserHtml, injectSiteHtml } from './injectSiteHtml';
import { slugify } from './slug';
import type { SitePayload } from './types';

export type ExportResult =
  { ok: true } | { ok: false; reason: 'no-selection' | 'unavailable' | 'failed' };

async function addRuntimeFiles(zip: JSZip, files: string[]): Promise<void> {
  for (const file of files) {
    if (file === 'site.html') continue;
    const buffer = await fetchExportFile(file);
    zip.file(file, buffer);
  }
  try {
    const favicon = await fetchExportFile('favicon.svg');
    zip.file('favicon.svg', favicon);
  } catch {
    // public favicon is optional in some hosts
  }
}

async function runtimeParts(): Promise<{ html: string; files: string[] }> {
  const manifest = await fetchExportManifest();
  const html = await fetchExportText(manifest.html);
  return { html, files: manifest.files };
}

function payloadFor(
  project: Project,
  conceptId: ConceptId,
  media: Record<string, string>,
): SitePayload {
  return { project, conceptId, media };
}

export async function exportSelectedConcept(project: Project): Promise<ExportResult> {
  const conceptId = project.selectedConceptId;
  if (!conceptId) return { ok: false, reason: 'no-selection' };
  try {
    const [{ html, files }, media] = await Promise.all([
      runtimeParts(),
      collectExportMedia(project),
    ]);
    const zip = new JSZip();
    zip.file(
      'index.html',
      injectSiteHtml(html, payloadFor(project, conceptId, media.urls)),
    );
    await addRuntimeFiles(zip, files);
    for (const file of media.files) {
      zip.file(file.path, file.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, `${slugify(project.brand.name)}-${conceptId}.zip`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ExportUnavailableError) {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: false, reason: 'failed' };
  }
}

export async function exportAllConcepts(project: Project): Promise<ExportResult> {
  if (!isCompleteConceptSet(project.generatedConcepts)) {
    return { ok: false, reason: 'failed' };
  }
  try {
    const [{ html, files }, media] = await Promise.all([
      runtimeParts(),
      collectExportMedia(project),
    ]);
    const zip = new JSZip();
    const names = CONCEPT_IDS.map((id) => ({
      id,
      label: de.gallery.names[id],
      href: `./${id}.html`,
    }));
    zip.file('index.html', buildChooserHtml(project.brand.name, names));
    for (const id of CONCEPT_IDS) {
      zip.file(`${id}.html`, injectSiteHtml(html, payloadFor(project, id, media.urls)));
    }
    await addRuntimeFiles(zip, files);
    for (const file of media.files) {
      zip.file(file.path, file.blob);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, `${slugify(project.brand.name)}-konzepte.zip`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ExportUnavailableError) {
      return { ok: false, reason: 'unavailable' };
    }
    return { ok: false, reason: 'failed' };
  }
}
