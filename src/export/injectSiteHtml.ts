import { de } from '../i18n/de';
import type { SitePayload } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function injectSiteHtml(html: string, payload: SitePayload): string {
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const title = escapeHtml(payload.project.brand.name.trim() || 'Website');
  let out = html.replaceAll('/assets/', './assets/');
  out = out.replaceAll('href="/favicon.svg"', 'href="./favicon.svg"');
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  if (!out.includes('window.__LPS_SITE__')) {
    out = out.replace(
      '<head>',
      `<head>\n    <script>window.__LPS_SITE__=${json}</script>`,
    );
  }
  return out;
}

export function buildChooserHtml(
  brand: string,
  names: Array<{ id: string; label: string; href: string }>,
): string {
  const title = escapeHtml(brand.trim() || 'Website');
  const links = names
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`,
    )
    .join('\n        ');
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Plus+Jakarta+Sans:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      :root { color-scheme: dark; background: #09090b; color: #f5f2eb; }
      body { margin: 0; min-height: 100svh; font-family: 'Plus Jakarta Sans', sans-serif; background: #09090b; }
      main { max-width: 720px; margin: 0 auto; padding: 80px 24px; }
      h1 { font-family: 'Instrument Serif', serif; font-size: clamp(40px, 8vw, 72px); font-weight: 400; margin: 0 0 12px; }
      p { color: #6f6b64; margin: 0 0 40px; }
      ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
      a { display: block; padding: 18px 20px; border: 1px solid rgba(255,255,255,.08); color: inherit; text-decoration: none; letter-spacing: .14em; text-transform: uppercase; font-size: 13px; }
      a:hover { border-color: rgba(255,255,255,.24); }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${escapeHtml(de.export.chooserHint)}</p>
      <ul>
        ${links}
      </ul>
    </main>
  </body>
</html>
`;
}
