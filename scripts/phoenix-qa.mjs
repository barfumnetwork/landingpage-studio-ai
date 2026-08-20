import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const outDir = '/tmp/phoenix-qa';
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function serve() {
  const index = readFileSync(join(dist, 'index.html'));
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    let filePath = join(dist, decodeURIComponent(url.pathname));
    if (url.pathname === '/' || !extname(url.pathname)) {
      filePath = join(dist, 'index.html');
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      send(res, 200, index, mime['.html']);
      return;
    }
    send(res, 200, readFileSync(filePath), mime[extname(filePath)] ?? 'application/octet-stream');
  });
  const port = await new Promise((resolvePort) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolvePort(typeof address === 'object' && address ? address.port : 4173);
    });
  });
  return { server, origin: `http://127.0.0.1:${port}` };
}

async function walkWizard(page) {
  for (let i = 0; i < 20; i += 1) {
    const generate = page.getByRole('button', { name: 'Meine Konzepte erzeugen' });
    if (await generate.count()) {
      await generate.click();
      await page.waitForTimeout(300);
      return;
    }
    const next = page.getByRole('button', { name: 'Weiter', exact: true });
    const skip = page.locator('[data-wizard-skip]');
    if ((await next.count()) && (await next.isEnabled())) {
      await next.click();
      await page.waitForTimeout(120);
      continue;
    }
    if (await skip.count()) {
      await skip.click();
      await page.waitForTimeout(120);
      continue;
    }
    throw new Error(`Wizard stuck at step ${String(i)}`);
  }
}

async function waitCanvas(page) {
  await page
    .waitForFunction(() => {
      const nodes = [...document.querySelectorAll('canvas')];
      return nodes.some((node) => node instanceof HTMLCanvasElement && node.width > 16 && node.height > 16);
    }, { timeout: 12000 })
    .catch(() => undefined);
}

async function openChamber(page) {
  const opened = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Vollbild CHAMBER"]');
    if (!(btn instanceof HTMLButtonElement)) return false;
    btn.click();
    return true;
  });
  if (!opened) {
    await page.getByRole('button', { name: 'Vollbild CHAMBER' }).click({ force: true });
  }
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await waitCanvas(page);
  await page.waitForTimeout(2200);
}

async function closePreview(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Vorschau schließen"]');
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await page.waitForTimeout(350);
}

async function scrollFilm(page, t) {
  await page.evaluate((progress) => {
    const dialog = document.querySelector('[role="dialog"]');
    const scroller =
      dialog?.querySelector('[data-preview-scroller]') ??
      dialog ??
      document.scrollingElement;
    if (!(scroller instanceof HTMLElement) && scroller !== document.scrollingElement) return;
    const el = scroller instanceof HTMLElement ? scroller : document.scrollingElement;
    if (!el) return;
    const span = el.scrollHeight - (el === document.scrollingElement ? window.innerHeight : el.clientHeight);
    if ('scrollTo' in el) el.scrollTo(0, Math.max(0, span * progress));
    else window.scrollTo(0, Math.max(0, span * progress));
  }, t);
  await page.waitForTimeout(900);
}

async function shot(page, name) {
  await page.mouse.move(0, 0);
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function captureSilhouette(page, tag) {
  await page.evaluate(() => {
    window.__PHOENIX_SILHOUETTE__ = true;
  });
  await openChamber(page);
  await page.evaluate(() => {
    document.documentElement.dataset.phoenixSilhouette = '1';
  });
  await scrollFilm(page, 0);
  await shot(page, `${tag}-sil-awaken`);
  await scrollFilm(page, 0.32);
  await shot(page, `${tag}-sil-flight`);
  await closePreview(page);
}

async function captureChamber(page, tag) {
  await openChamber(page);
  const beats = [
    [0, 'awaken'],
    [0.16, 'ascension'],
    [0.32, 'flight'],
    [0.52, 'feather'],
    [0.7, 'infinity'],
    [0.96, 'rebirth'],
  ];
  for (const [t, name] of beats) {
    await scrollFilm(page, t);
    await shot(page, `${tag}-${name}`);
  }
  await closePreview(page);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { server, origin } = await serve();
  const playwright = await import('playwright');
  const chromePath =
    process.env.CHROME_PATH ??
    ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find((path) =>
      existsSync(path),
    );
  const browser = await playwright.chromium.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.__PHOENIX_SILHOUETTE__ = true;
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Demo ansehen' }).click();
  const confirm = page.getByRole('button', { name: 'Löschen und neu beginnen' });
  if (await confirm.count()) {
    await confirm.click();
  }
  await page.getByLabel('Markenname').or(page.locator('#brand-name')).waitFor({ timeout: 8000 }).catch(() => undefined);
  await walkWizard(page);
  await page.getByRole('heading', { name: 'CHAMBER' }).waitFor({ timeout: 45000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await waitCanvas(page);
  await page.waitForTimeout(1400);
  await shot(page, 'gallery-1440');

  await captureChamber(page, '1440');
  await openChamber(page);
  await shot(page, 'fullscreen-1440');
  const motion = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1];
  for (let i = 0; i < motion.length; i += 1) {
    await scrollFilm(page, motion[i]);
    await shot(page, `motion-1440-${String(i).padStart(2, '0')}`);
  }
  await closePreview(page);

  await page.setViewportSize({ width: 430, height: 932 });
  await page.waitForTimeout(400);
  await captureChamber(page, '430');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await shot(page, 'gallery-390');
  await captureChamber(page, '390');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  await captureSilhouette(page, '1440');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await captureSilhouette(page, '390');

  const canvas = await page.evaluate(() => document.querySelectorAll('canvas').length);
  writeFileSync(
    join(outDir, 'report.json'),
    JSON.stringify({ origin, canvas, errors }, null, 2),
  );
  await browser.close().catch(() => undefined);
  server.close();
  console.log(`Wrote ${outDir}`);
  if (errors.length) console.log(errors.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
