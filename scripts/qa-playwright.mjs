import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const dist = resolve(process.cwd(), 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('QA failed: dist/index.html missing. Run pnpm build first.');
    process.exit(1);
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
  const origin = `http://127.0.0.1:${port}`;

  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.log('Playwright: SKIPPED (package not installed)');
    const home = await fetch(origin);
    if (!home.ok) {
      console.error('QA failed: homepage not reachable');
      process.exit(1);
    }
    const html = await home.text();
    if (!html.includes('Landingpage Studio')) {
      console.error('QA failed: homepage markup missing');
      process.exit(1);
    }
    const site = await fetch(`${origin}/site.html`);
    const manifest = await fetch(`${origin}/export-manifest.json`);
    if (!site.ok || !manifest.ok) {
      console.error('QA failed: site runtime missing');
      process.exit(1);
    }
    console.log('Playwright: fallback HTTP checks passed');
    server.close();
    return;
  }

  const chromePath =
    process.env.CHROME_PATH ??
    ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium'].find(
      (path) => existsSync(path),
    );
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
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
  const headline = await page.locator('h1').first().textContent();
  if (!headline?.includes('Website')) {
    throw new Error(`Homepage headline missing: ${headline ?? 'empty'}`);
  }
  const skip = await page.locator('a[href="#main"]').first().count();
  if (skip === 0) {
    throw new Error('Skip link missing');
  }

  const viewports = [
    { width: 375, height: 812, max: 400 },
    { width: 390, height: 844, max: 430 },
    { width: 430, height: 932, max: 460 },
    { width: 768, height: 1024, max: 788 },
    { width: 1024, height: 768, max: 1044 },
    { width: 1440, height: 900, max: 1460 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > viewport.max) {
      throw new Error(`${String(viewport.width)}px overflow: ${String(width)}`);
    }
  }

  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto(`${origin}/site.html`, { waitUntil: 'domcontentloaded' });

  await browser.close();
  server.close();

  const serious = errors.filter((item) => !item.includes('supabase'));
  if (serious.length > 0) {
    console.error('Console errors:\n' + serious.join('\n'));
    process.exit(1);
  }
  console.log('Playwright: homepage, skip-link, 375/390/430/768/1024/1440, site.html passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
