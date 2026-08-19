# Landingpage Studio AI

Premium-Generator für fünf eigenständige Landingpage-Konzepte.

Die Generator-App ist ein dunkles Creative-Tech-Werkzeug. Kundendaten werden Schritt für Schritt erfasst, in fünf Konzepte übersetzt und später als eigenständige Websites exportiert.

**Aktueller Stand: Phase 11 — Final Concept Renderer REEL.**  
Die Engine bleibt für Planung, Mapping und CTA zuständig. Renderer sind nur Presentation. CHAMBER, ATELIER, SIGNAL und REEL haben finale Renderer. IMPRINT bleibt Structural Preview.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand
- React Router
- IndexedDB für Binärdateien
- `@imgly/background-removal` für lokale Logo-Freistellung
- `gsap` lazy für CHAMBER-, ATELIER-, SIGNAL- und REEL-Hero-Intro
- `three` nur für CHAMBER (leerer Hero), lazy

## Lokal starten

Node.js 20 oder neuer. pnpm empfohlen.

```bash
pnpm install
pnpm dev
```

App: [http://localhost:5173](http://localhost:5173)

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

Karten bleiben Structural Preview. Three.js und finale Renderer werden in der Gallery nicht geladen.

Aktionen:

- **Ansehen / Vollbild**
  - CHAMBER → finaler `ChamberRenderer` (lazy)
  - ATELIER → finaler `AtelierRenderer` (lazy)
  - SIGNAL → finaler `SignalRenderer` (lazy)
  - REEL → finaler `ReelRenderer` (lazy)
  - IMPRINT → Structural Preview
- **Auswählen** setzt `selectedConceptId` und `phase = selected`
- **Neu erzeugen** (`regenerateConceptPlan`)

Export ist vorbereitet, aber deaktiviert.

## Renderer

`src/renderers/` ist die Presentation-Schicht.

Contract (`ConceptRendererProps`): `project`, `concept`, `selectedConceptId`, `previewMode`, optional `reducedMotion` und `onClose`.

Registry:

- `chamber` → ChamberRenderer
- `atelier` → AtelierRenderer
- `signal` → SignalRenderer
- `reel` → ReelRenderer
- `imprint` → nicht implementiert

`ConceptRenderer` wählt den Loader anhand von `concept.id`. Jeder Renderer ist ein eigener lazy Chunk. Error Boundary: „Diese Vorschau konnte nicht geladen werden.“ + „Zur Galerie“. Boundary-Key ist `concept.id`.

Renderer lesen weder localStorage noch IndexedDB direkt. Assets: `useRendererAsset` → `useAssetObjectUrl`.

## Konzepte

CHAMBER: dunkel, architektonisch, Creative-Tech. Optional Three.js-Leere im Hero ohne Asset.

ATELIER: helleres Gallery-/Editorial-Feeling. Kein Three.js. Instrument Serif führt.

SIGNAL: dunkel, editorial-tech, Raster, IBM Plex Mono. Kein Three.js.

REEL: cinematic, media-first. Hero bevorzugt `VIDEO_HERO`, sonst `IMAGE_HERO`, sonst CSS-Fallback. Kein Three.js. Kein Custom-Player. Overlay nur mit bestehenden Tokens (`--app-scrim`).

Alle: nur `sectionPlan`, nur echte Project-Daten, CTA nur wenn `resolveCtaTarget.renderable`, GSAP lazy und nicht bei `prefers-reduced-motion`.

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

## Architektur (Phase 11)

- `src/app` — Shell, Routing, Welcome, ProjectScreen
- `src/features/wizard` — 12-Step-Wizard
- `src/features/assets` — Logo-, Bild- und Video-Upload
- `src/features/generation` — Ritual, Recovery, Error
- `src/features/gallery` — Concept Cards, Structural Preview, Selection
- `src/renderers` — Contract, Registry, CHAMBER, ATELIER, SIGNAL, REEL
- `src/generator` — Normalize, Section Planner, Asset Mapper, Concept Plans
- `src/store` — Project State, Generation-Session, Asset-Aktionen

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Datenschutz

Kundendaten und Assets bleiben im Browser. Keine externen AI-APIs, keine Uploads, keine Telemetrie.

## Netlify

Vorbereitet in `.netlify.toml`.

Kein Deploy in Phase 11.

## Lizenz

Privat / unveröffentlicht. `@imgly/background-removal` unterliegt der AGPL; siehe deren LICENSE.
