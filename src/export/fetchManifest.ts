import type { ExportManifest } from './types';

export class ExportUnavailableError extends Error {
  constructor() {
    super('export-manifest-missing');
    this.name = 'ExportUnavailableError';
  }
}

function baseUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
}

export async function fetchExportManifest(): Promise<ExportManifest> {
  const response = await fetch(`${baseUrl()}export-manifest.json`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new ExportUnavailableError();
  }
  const data = (await response.json()) as ExportManifest;
  if (!data.html || !Array.isArray(data.files)) {
    throw new ExportUnavailableError();
  }
  return data;
}

export async function fetchExportFile(path: string): Promise<ArrayBuffer> {
  const response = await fetch(`${baseUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`missing-export-file:${path}`);
  }
  return response.arrayBuffer();
}

export async function fetchExportText(path: string): Promise<string> {
  const response = await fetch(`${baseUrl()}${path}`);
  if (!response.ok) {
    throw new Error(`missing-export-file:${path}`);
  }
  return response.text();
}
