# Landingpage Studio AI

Premium-Generator für fünf eigenständige Landingpage-Konzepte.

Die Generator-App ist ein dunkles Creative-Tech-Werkzeug. Kundendaten werden Schritt für Schritt erfasst, in fünf Konzepte übersetzt und später als eigenständige Websites exportiert.

**Aktueller Stand: Phase 18 — Final Master Quality Pass.**  
Motion-System, WebGL (CHAMBER Shatter/Kamera, SIGNAL Displacement), kinetische Typography, cinematic REEL-Controls, identitätsstarke Gallery und Production-QA.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand
- React Router
- IndexedDB für Binärdateien
- JSZip für den Client-Export
- `@imgly/background-removal` für lokale Logo-Freistellung
- `gsap` lazy für CHAMBER-, ATELIER-, SIGNAL-, REEL- und IMPRINT-Intro, Scroll-Reveals und Media-Parallax
- `three` lazy: CHAMBER Void (Shatter/Kamera) und SIGNAL Displacement-Feld

## Lokal starten

Node.js 20 oder neuer. pnpm empfohlen.

```bash
pnpm install
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)

ZIP-Export braucht den Production-Build (`pnpm build && pnpm preview` oder Pages). In `pnpm dev` bleibt „Als Website öffnen“ aktiv.

## Generation Experience

Review → „Meine Konzepte erzeugen“ startet einen echten Generation-Lauf:

1. Pflichtfelder prüfen
2. `project.phase = generating`
3. Acht visuelle Phasen (ca. 7.5–9.5 s, mit Mindestdauern)
4. Parallel: `generateProjectConcepts()` aus Phase 6
5. Nur bei vollständigem Ergebnis persistieren
6. `project.phase = gallery`

Die Inszenierung behauptet keine erfundenen KI-Analysen. Progress wartet bei etwa 95 %, bis das Engine-Ergebnis vorliegt.

Bei Fehler: Daten bleiben. Keine halben Concepts. Retry oder zurück zum Review.

Reload während Generation: Recovery, keine Fake-Fortsetzung.

`prefers-reduced-motion`: kurzer Crossfade, ca. 400 ms, dann Gallery.

## Concept Gallery

Fünf Cards (CHAMBER, ATELIER, SIGNAL, REEL, IMPRINT) lesen gespeicherte `GeneratedConcept`-Daten.

Karten bleiben Structural Preview. Three.js und finale Renderer werden in der Gallery nicht geladen. Jede Card hat eine eigene visuelle Identität, Pointer-Tilt und Filter (ALLE + fünf Konzepte). Preview-Modal: Fokusfalle, Escape, Pfeiltasten.

Aktionen:

- **Ansehen / Vollbild**
  - CHAMBER → finaler `ChamberRenderer` (lazy)
  - ATELIER → finaler `AtelierRenderer` (lazy)
  - SIGNAL → finaler `SignalRenderer` (lazy)
  - REEL → finaler `ReelRenderer` (lazy)
  - IMPRINT → finaler `ImprintRenderer` (lazy)
- **Auswählen** setzt `selectedConceptId` und `phase = selected`
- **Neu erzeugen** (`regenerateConceptPlan`)
- **Als Website öffnen** → `/project/:id/view/:conceptId` ohne App-Chrome
- **Website exportieren** → ZIP mit Standalone-Runtime, `index.html` und Medien
- **Alle 5 exportieren** → ZIP mit Chooser plus fünf HTML-Einstiegen

Nach erfolgreichem Export: `phase = exported`.

## Renderer

`src/renderers/` ist die Presentation-Schicht.

Contract (`ConceptRendererProps`): `project`, `concept`, `selectedConceptId`, `previewMode`, optional `reducedMotion` und `onClose`.

`previewMode`: `modal` | `fullscreen` | `site`. `site` nutzt native Hash-Navigation.

Registry:

- `chamber` → ChamberRenderer
- `atelier` → AtelierRenderer
- `signal` → SignalRenderer
- `reel` → ReelRenderer
- `imprint` → ImprintRenderer

`ConceptRenderer` wählt den Loader anhand von `concept.id`. Jeder Renderer ist ein eigener lazy Chunk. Error Boundary: „Diese Vorschau konnte nicht geladen werden.“ + „Zur Galerie“. Boundary-Key ist `concept.id`.

Renderer lesen weder localStorage noch IndexedDB direkt. Assets: `useRendererAsset` → `AssetSource` (IndexedDB in der App, relative `media/`-Pfade im Export).

## Konzepte

CHAMBER: dunkel, architektonisch, Creative-Tech. Optional Three.js-Leere im Hero ohne Asset: Tetraeder-Shatter, Debris, Kamera-Descent, Reflexionsboden.

ATELIER: helleres Gallery-/Editorial-Feeling. Kein Three.js. Instrument Serif führt. Scroll-Parallax auf Medien.

SIGNAL: dunkel, editorial-tech, Raster, IBM Plex Mono. Optional WebGL Displacement/Refraction im Hero (kein Three.js bei Reduced Motion oder fehlendem WebGL).

REEL: cinematic, media-first. Hero bevorzugt `VIDEO_HERO`, sonst `IMAGE_HERO`, sonst CSS-Fallback. Cinematic Play/Pause und Scrub statt nativer Controls. Overlay nur mit bestehenden Tokens (`--app-scrim`).

IMPRINT: monumental, typografisch, editorial branding. Instrument Serif führt Brand und Statements. Zeichen-Reveal (`KineticText`) im Hero. Plus Jakarta Sans für Body/Nav. IBM Plex Mono für Indizes. Hero bevorzugt `IMAGE_HERO`, sonst `VIDEO_HERO`, sonst typografisch ohne Fake-Bild. Kein Three.js.

Alle: nur `sectionPlan`, nur echte Project-Daten, CTA nur wenn `resolveCtaTarget.renderable`, GSAP lazy und nicht bei `prefers-reduced-motion`.

## Export

`src/export/` baut ein Offline-Paket aus der gebauten `site.html`-Runtime (`export-manifest.json`), Project-JSON und IndexedDB-Blobs.

Einzel-Export: `marke-konzept.zip` mit `index.html`, `assets/`, `media/`.

Fünfer-Export: `marke-konzepte.zip` mit Chooser-`index.html` plus `chamber.html` … `imprint.html`.

Keine erfundenen Inhalte. Fehlende Blobs werden weggelassen; Renderer zeigen vorhandene Placeholder.

## Logo-Verarbeitung

Die Logo-Verarbeitung erfolgt lokal im Browser. Ihre Datei wird nicht an einen externen Dienst hochgeladen.

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
| `pnpm qa`           | Playwright oder HTTP-Fallback gegen `dist` |

## Architektur (Phase 18)

- `src/app` — Shell, Routing, Welcome, ProjectScreen, SiteView, Cursor, Skip-Link
- `src/features/wizard` — 12-Step-Wizard
- `src/features/assets` — Logo-, Bild- und Video-Upload
- `src/features/generation` — Ritual, Recovery, Error
- `src/features/gallery` — Concept Cards, Structural Preview, Selection, Export
- `src/motion` — gemeinsames Easing, Intro, Scroll-Reveal, Nav-Shrink, Media-Parallax
- `src/renderers` — Contract, Registry, CHAMBER, ATELIER, SIGNAL, REEL, IMPRINT
- `src/generator` — Normalize, Section Planner, Asset Mapper, Concept Plans
- `src/export` — ZIP-Paket, Manifest, Media-Sammlung
- `src/site` — Standalone-Runtime für exportierte Websites
- `src/store` — Project State, Generation-Session, Asset-Aktionen

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Datenschutz

Kundendaten und Assets bleiben im Browser. Keine externen AI-APIs, keine Uploads, keine Telemetrie. Der ZIP-Export verlässt den Rechner nur, wenn Sie die Datei selbst teilen.

## Deploy

Cloudflare Pages: `public/_redirects` (SPA), `public/_headers`. Build: `pnpm build`, Publish: `dist`.

Netlify bleibt in `netlify.toml` vorbereitet.

## Lizenz

Privat / unveröffentlicht. `@imgly/background-removal` unterliegt der AGPL; siehe deren LICENSE.
