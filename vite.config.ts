import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function isStudioOnly(fileName: string): boolean {
  const name = fileName.toLowerCase();
  if (name.endsWith('.wasm')) return true;
  if (/(^|\/)ort([.-]|$)/.test(name)) return true;
  if (/(^|\/)main-[^/]+\.(js|css)$/.test(fileName)) return true;
  return false;
}

function walkChunk(
  fileName: string,
  bundle: Record<
    string,
    {
      type: string;
      imports?: string[];
      dynamicImports?: string[];
      viteMetadata?: {
        importedCss?: Iterable<string>;
        importedAssets?: Iterable<string>;
      };
    }
  >,
  seen: Set<string>,
): void {
  if (seen.has(fileName) || isStudioOnly(fileName)) return;
  seen.add(fileName);
  const item = bundle[fileName];
  if (!item || item.type !== 'chunk') return;
  for (const imported of item.imports ?? []) walkChunk(imported, bundle, seen);
  for (const imported of item.dynamicImports ?? []) walkChunk(imported, bundle, seen);
  const css = item.viteMetadata?.importedCss;
  if (css) {
    for (const file of css) {
      if (!isStudioOnly(file)) seen.add(file);
    }
  }
  const assets = item.viteMetadata?.importedAssets;
  if (assets) {
    for (const file of assets) {
      if (!isStudioOnly(file)) seen.add(file);
    }
  }
}

function filesFromHtml(source: string): string[] {
  const found: string[] = [];
  const pattern = /(?:src|href)="([^"]+)"/g;
  let match = pattern.exec(source);
  while (match) {
    const ref = match[1].replace(/^\//, '');
    if (ref.startsWith('assets/')) found.push(ref);
    match = pattern.exec(source);
  }
  return found;
}

function exportManifestPlugin(): Plugin {
  return {
    name: 'export-manifest',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['site.html'];
      const seen = new Set<string>(['site.html']);
      if (
        htmlAsset &&
        htmlAsset.type === 'asset' &&
        typeof htmlAsset.source === 'string'
      ) {
        for (const file of filesFromHtml(htmlAsset.source)) {
          walkChunk(file, bundle, seen);
        }
      }
      if (seen.size <= 1) {
        for (const fileName of Object.keys(bundle)) {
          if (fileName.startsWith('assets/') && !isStudioOnly(fileName)) {
            seen.add(fileName);
          }
        }
      }
      const files = [...seen].filter((file) => !isStudioOnly(file)).sort();
      this.emitFile({
        type: 'asset',
        fileName: 'export-manifest.json',
        source: `${JSON.stringify({ html: 'site.html', files }, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), exportManifestPlugin()],
  optimizeDeps: {
    exclude: ['@imgly/background-removal', 'onnxruntime-web'],
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        site: 'site.html',
      },
    },
  },
});
