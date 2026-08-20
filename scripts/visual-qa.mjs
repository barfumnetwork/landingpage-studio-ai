import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const outDir = '/tmp/visual-qa-shots';
const publishDir = '/opt/cursor/artifacts/screenshots';
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
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error('dist/index.html missing. Run pnpm build first.');
  }
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
    const type = mime[extname(filePath)] ?? 'application/octet-stream';
    send(res, 200, readFileSync(filePath), type);
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
  throw new Error('Wizard did not reach generate');
}

async function shot(page, name, keepPointer = false) {
  if (!keepPointer) {
    await page.mouse.move(0, 0);
    await page.evaluate(() => {
      document.documentElement.classList.remove('cursor-hot');
      delete document.documentElement.dataset.cursor;
      document.querySelectorAll('[data-on="true"]').forEach((node) => {
        if (node instanceof HTMLElement) {
          node.dataset.on = 'false';
          node.textContent = '';
        }
      });
    });
  }
  const path = join(outDir, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  return path;
}

async function waitForDialogCanvas(page) {
  await page
    .waitForFunction(() => {
      const canvas = document.querySelector('[role="dialog"] canvas');
      return canvas instanceof HTMLCanvasElement && canvas.width > 16 && canvas.height > 16;
    }, { timeout: 8000 })
    .catch(() => undefined);
}

async function openConcept(page, name, mode, settleMs = 3600) {
  const label = mode === 'view' ? `Ansehen ${name}` : `Vollbild ${name}`;
  const opened = await page.evaluate((aria) => {
    const btn = document.querySelector(`[aria-label="${aria}"]`);
    if (!(btn instanceof HTMLButtonElement)) return false;
    btn.click();
    return true;
  }, label);
  if (!opened) {
    await page.getByRole('button', { name: label }).click({ force: true });
  }
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  if (name === 'CHAMBER' || name === 'SIGNAL') {
    await waitForDialogCanvas(page);
  }
  await page.waitForTimeout(settleMs);
}

async function closePreview(page) {
  await page.evaluate(() => {
    const btn = document.querySelector('[aria-label="Vorschau schließen"]');
    if (btn instanceof HTMLButtonElement) btn.click();
  });
  await page.waitForTimeout(400);
}

async function captureMotion(page, tag) {
  await openConcept(page, 'CHAMBER', 'full', 900);
  await shot(page, `${tag}-chamber-motion`);
  await closePreview(page);

  await page.getByRole('button', { name: 'Vollbild SIGNAL' }).click({ force: true });
  await waitForDialogCanvas(page);
  await page.waitForTimeout(360);
  const canvas = page.locator('[role="dialog"] canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.22, box.y + box.height * 0.42);
    await page.waitForTimeout(60);
    await page.mouse.move(box.x + box.width * 0.74, box.y + box.height * 0.58, { steps: 14 });
    await page.waitForTimeout(90);
  }
  await shot(page, `${tag}-signal-motion`, true);
  await closePreview(page);

  await page.getByRole('button', { name: 'Vollbild REEL' }).click({ force: true });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.waitForTimeout(920);
  await shot(page, `${tag}-reel-motion`);
  await closePreview(page);

  await page.getByRole('button', { name: 'Vollbild IMPRINT' }).click({ force: true });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page.waitForTimeout(260);
  await shot(page, `${tag}-imprint-motion`);
  await closePreview(page);
}

async function captureViewport(page, tag, withMotion) {
  const names = ['CHAMBER', 'ATELIER', 'SIGNAL', 'REEL', 'IMPRINT'];
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator('.list, [class*="list"]').first().waitFor({ timeout: 5000 }).catch(() => undefined);
  await shot(page, `${tag}-gallery-top`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
  await page.waitForTimeout(500);
  await shot(page, `${tag}-gallery-scroll`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);

  for (const name of names) {
    await openConcept(page, name, 'view');
    await shot(page, `${tag}-${name.toLowerCase()}-modal`);
    await closePreview(page);
    await openConcept(page, name, 'full');
    await shot(page, `${tag}-${name.toLowerCase()}-full`);
    await closePreview(page);
  }
  if (withMotion) await captureMotion(page, tag);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const { server, origin } = await serve();
  const playwright = await import('playwright');
  const chromePath =
    process.env.CHROME_PATH ??
    ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(
      (path) => existsSync(path),
    );
  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  };
  if (chromePath) launchOptions.executablePath = chromePath;
  const browser = await playwright.chromium.launch(launchOptions);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Demo ansehen' }).click();
  await page.getByLabel('Markenname').or(page.locator('#brand-name')).waitFor({ timeout: 8000 });
  await walkWizard(page);
  await page.getByRole('button', { name: 'Ansehen CHAMBER' }).waitFor({ timeout: 25000 });
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve()));
  await page
    .waitForFunction(() => {
      const canvas = document.querySelector('canvas');
      return canvas instanceof HTMLCanvasElement && canvas.width > 16;
    }, { timeout: 8000 })
    .catch(() => undefined);
  await page.waitForTimeout(1400);
  await captureViewport(page, 'd1440', true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await captureViewport(page, 'm390', true);

  await page.setViewportSize({ width: 430, height: 932 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await shot(page, 'm430-gallery-top');
  for (const name of ['CHAMBER', 'ATELIER', 'SIGNAL', 'REEL', 'IMPRINT']) {
    await openConcept(page, name, 'full');
    await shot(page, `m430-${name.toLowerCase()}-full`);
    await closePreview(page);
  }
  await captureMotion(page, 'm430');

  writeFileSync(join(outDir, 'console.json'), JSON.stringify(errors, null, 2));
  await browser.close().catch(() => undefined);
  try {
    server.close();
  } catch {
    /* ignore flaky EIO on close */
  }
  mkdirSync(publishDir, { recursive: true });
  for (const file of readdirSync(outDir)) {
    copyFileSync(join(outDir, file), join(publishDir, file));
  }
  const serious = errors.filter((item) => !item.includes('supabase'));
  console.log(`Visual QA wrote screenshots to ${publishDir}`);
  console.log(`Console errors: ${String(serious.length)}`);
  if (serious.length) console.log(serious.join('\n'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
