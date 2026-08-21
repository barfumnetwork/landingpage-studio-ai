import { mkdirSync, readdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const src = '/tmp/phoenix-qa';
const dest = '/tmp/phoenix-visual-qa-site';
mkdirSync(dest, { recursive: true });

const groups = [
  {
    title: 'Desktop 1440',
    items: [
      ['1440-awaken.png', 'AWAKEN'],
      ['1440-flight.png', 'FLIGHT'],
      ['1440-feather.png', 'FEATHER'],
      ['1440-infinity.png', 'INFINITY'],
      ['1440-rebirth.png', 'REBIRTH'],
    ],
  },
  {
    title: 'Mobile 390',
    items: [
      ['390-awaken.png', 'AWAKEN'],
      ['390-flight.png', 'FLIGHT'],
      ['390-feather.png', 'FEATHER'],
      ['390-infinity.png', 'INFINITY'],
      ['390-rebirth.png', 'REBIRTH'],
    ],
  },
  {
    title: 'Mobile 430',
    items: [
      ['430-awaken.png', 'AWAKEN'],
      ['430-flight.png', 'FLIGHT'],
      ['430-feather.png', 'FEATHER'],
      ['430-infinity.png', 'INFINITY'],
      ['430-rebirth.png', 'REBIRTH'],
    ],
  },
  {
    title: 'Gallery / Fullscreen / Motion',
    items: [
      ['gallery-1440.png', 'Gallery 1440'],
      ['gallery-390.png', 'Gallery 390'],
      ['fullscreen-1440.png', 'Fullscreen Phoenix'],
      ['motion-1440.jpg', 'Motion / Scroll strip'],
    ],
  },
  {
    title: 'Silhouette (matte white on gray)',
    items: [
      ['1440-sil-awaken.png', '1440 silhouette AWAKEN'],
      ['1440-sil-flight.png', '1440 silhouette FLIGHT'],
      ['390-sil-awaken.png', '390 silhouette AWAKEN'],
      ['390-sil-flight.png', '390 silhouette FLIGHT'],
    ],
  },
];

const copied = [];
for (const file of readdirSync(src)) {
  if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.webm')) continue;
  copyFileSync(join(src, file), join(dest, file));
  copied.push(file);
}

const cards = groups
  .map((group) => {
    const figs = group.items
      .filter(([file]) => copied.includes(file))
      .map(([file, label]) => {
        const bytes = statSync(join(dest, file)).size;
        return `<figure>
  <a href="./${file}" target="_blank" rel="noreferrer">
    <img src="./${file}" alt="${label}" loading="eager" />
  </a>
  <figcaption>${label} · <a href="./${file}">${file}</a> · ${(bytes / 1024).toFixed(0)} KB</figcaption>
</figure>`;
      })
      .join('\n');
    return `<section><h2>${group.title}</h2><div class="grid">${figs}</div></section>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Chamber Phoenix — Visual QA</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font: 15px/1.45 ui-sans-serif, system-ui, sans-serif; background: #151311; color: #e6cfa5; }
    header { padding: 28px 20px 8px; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 560; letter-spacing: -0.04em; margin: 0 0 8px; color: #f3eee4; }
    p { margin: 0 0 12px; color: #8299a0; }
    section { max-width: 1200px; margin: 0 auto 36px; padding: 0 20px; }
    h2 { font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; color: #c58a4b; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
    figure { margin: 0; background: #2a2520; border-radius: 12px; overflow: hidden; }
    img { display: block; width: 100%; height: auto; background: #1a1714; }
    figcaption { padding: 10px 12px 12px; font-size: 12px; color: #c4b19a; }
    a { color: #e6cfa5; }
  </style>
</head>
<body>
  <header>
    <h1>Chamber Phoenix — Visual QA</h1>
    <p>Round 3 creature reconstruction. Click any frame for the full PNG. Production is unchanged.</p>
  </header>
  ${cards}
</body>
</html>
`;

writeFileSync(join(dest, 'index.html'), html);
writeFileSync(join(dest, '_headers'), `/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=300
`);
console.log(`Gallery at ${dest} (${copied.length} files)`);
