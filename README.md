# Landingpage Studio AI

Premium-Generator für fünf eigenständige Landingpage-Konzepte.

Die Generator-App ist ein dunkles Creative-Tech-Werkzeug. Kundendaten werden Schritt für Schritt erfasst, später in fünf Konzepte übersetzt und als eigenständige Websites exportiert.

**Aktueller Stand: Phase 3 — Wizard.**  
Asset-Upload, Generation, Preview und Export sind noch nicht enthalten.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand
- React Router

## Lokal starten

Node.js 20 oder neuer. pnpm empfohlen.

```bash
pnpm install
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)

## Scripts

| Script              | Zweck                     |
| ------------------- | ------------------------- |
| `pnpm dev`          | Entwicklungsserver        |
| `pnpm build`        | Production Build          |
| `pnpm preview`      | Lokale Preview des Builds |
| `pnpm typecheck`    | TypeScript                |
| `pnpm lint`         | oxlint                    |
| `pnpm format:check` | Prettier Check            |
| `pnpm format`       | Prettier Write            |

## Architektur (Phase 3)

- `src/app` — Shell, Routing, Welcome
- `src/features/wizard` — 12-Step-Wizard
- `src/styles` — Design Tokens und Global CSS
- `src/store` — Project State, Nested-Merge, Autosave
- `src/utils/storage.ts` — LocalStorage-Kapselung
- `src/i18n` — Deutsche UI-Texte
- `src/data/demoNoir.ts` — Demo-Datensatz NOIR

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Netlify

Vorbereitet in `.netlify.toml`.

- Build command: `pnpm build`
- Publish directory: `dist`
- Node: `20`
- SPA Redirects: `/* → /index.html`

Kein Deploy in Phase 3.

## Lizenz

Privat / unveröffentlicht.
