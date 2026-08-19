# Landingpage Studio AI

Premium-Generator für fünf eigenständige Landingpage-Konzepte.

Die Generator-App ist ein dunkles Creative-Tech-Werkzeug. Kundendaten werden Schritt für Schritt erfasst, später in fünf Konzepte übersetzt und als eigenständige Websites exportiert.

**Aktueller Stand: Phase 6 — Generation Engine Foundation.**  
Die Engine erzeugt Section-Pläne und Asset-Mappings. Sie rendert keine Landingpages.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand
- React Router
- IndexedDB für Binärdateien
- `@imgly/background-removal` für lokale Logo-Freistellung

## Lokal starten

Node.js 20 oder neuer. pnpm empfohlen.

```bash
pnpm install
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)

## Generation Engine Foundation

Aus dem Projektstand entstehen deterministisch fünf Concept-Pläne:

CHAMBER, ATELIER, SIGNAL, REEL, IMPRINT.

Jeder Plan enthält:

- SectionPlan (welche Abschnitte existieren)
- AssetMap (welche Dateien welchen Slots zugeordnet sind)
- Seed (stabil aus `project.id` + Concept-Id)

Die Engine schreibt keine Texte um und erfindet keine Fakten, Testimonials, Awards oder Stockbilder.

Pflicht vor Generation:

- Markenname mindestens 2 Zeichen
- Beschreibung mindestens 20 Zeichen

Review-Button „Meine Konzepte erzeugen“ speichert die Pläne im Project-JSON. Phase und Route bleiben unverändert. Preview, Gallery und Renderer kommen später.

## Logo-Verarbeitung

Die Logo-Verarbeitung erfolgt lokal im Browser. Ihre Datei wird nicht an einen externen Dienst hochgeladen.

- Formate: PNG, JPG, JPEG, WEBP, SVG
- SVG wird nicht gerastert und nicht automatisch freigestellt
- Rasterlogos: Original bleibt unverändert. Zusätzlich wird eine transparente PNG-Variante erzeugt
- Schlägt die Freistellung fehl oder dauert länger als 20 Sekunden: Original bleibt nutzbar, Retry möglich
- Optional kann ein eigenes PNG mit Transparenz hochgeladen werden
- Speicherung: Metadaten in LocalStorage, Binärdateien in IndexedDB

ONNX-/WASM-Modelldateien der Library können beim ersten Lauf von der IMG.LY-CDN geladen und vom Browser gecacht werden. Das Logo selbst bleibt auf dem Gerät.

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

## Architektur (Phase 6)

- `src/app` — Shell, Routing, Welcome
- `src/features/wizard` — 12-Step-Wizard
- `src/features/assets` — Logo-, Bild- und Video-Upload
- `src/generator` — Normalize, Section Planner, Asset Mapper, Concept Plans
- `src/utils/logoKnockout.ts` — lokale Background Removal
- `src/utils/storage.ts` — LocalStorage (Projekt-JSON)
- `src/utils/assetDb.ts` — IndexedDB (Blobs)
- `src/store` — Project State, Nested-Merge, Autosave, Asset-Aktionen, dünne Generation-Action

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Datenschutz

Kundendaten und Assets bleiben im Browser.

Die Generation Engine arbeitet nur auf Project-Metadaten. Keine externen AI-APIs, keine Uploads, keine Telemetrie.

## Netlify

Vorbereitet in `.netlify.toml`.

Kein Deploy in Phase 6.

## Lizenz

Privat / unveröffentlicht. `@imgly/background-removal` unterliegt der AGPL; siehe deren LICENSE.
