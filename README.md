# Landingpage Studio AI

Premium-Generator für fünf eigenständige Landingpage-Konzepte.

Die Generator-App ist ein dunkles Creative-Tech-Werkzeug. Kundendaten werden Schritt für Schritt erfasst, in fünf Konzepte übersetzt und später als eigenständige Websites exportiert.

**Aktueller Stand: Phase 8 — Renderer Foundation + CHAMBER.**  
Die Engine bleibt für Planung, Mapping und CTA zuständig. Renderer sind nur Presentation. CHAMBER hat einen finalen Renderer. ATELIER, SIGNAL, REEL und IMPRINT bleiben Structural Preview.

## Tech Stack

- React 19
- TypeScript
- Vite 8
- Zustand
- React Router
- IndexedDB für Binärdateien
- `@imgly/background-removal` für lokale Logo-Freistellung
- `three` und `gsap` nur für CHAMBER, lazy geladen

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

Karten bleiben Structural Preview: aktive Sections, Asset-Slots, echtes Hero-Bild wenn vorhanden, sonst abstrakter Placeholder. Keine Stockfotos, keine erfundenen Testimonials. Three.js wird in der Gallery nicht geladen.

Aktionen:

- **Ansehen / Vollbild**
  - CHAMBER → finaler `ChamberRenderer` (lazy)
  - ATELIER / SIGNAL / REEL / IMPRINT → Structural Preview
- **Auswählen** setzt `selectedConceptId` und `phase = selected`
- **Neu erzeugen** (`regenerateConceptPlan`)

Export ist vorbereitet, aber deaktiviert.

## Renderer

`src/renderers/` ist die Presentation-Schicht.

Contract (`ConceptRendererProps`): `project`, `concept`, `selectedConceptId`, `previewMode`, optional `reducedMotion` und `onClose`.

Registry: nur `chamber` hat einen Loader. Andere IDs ergeben „Renderer not implemented“ und werden von der Gallery nicht als Final Preview geöffnet.

Renderer lesen weder localStorage noch IndexedDB direkt. Assets kommen über `useRendererAsset` → `useAssetObjectUrl`. Keine neuen persistierten Felder, kein `Math.random()`, kein erneutes Mapping.

## CHAMBER

Editorial, dunkel, architektonisch. Nur Phase-1-Tokens. Nur Sections aus `concept.sectionPlan`, die enabled sind und echte Daten haben.

Hero: Claim oder Description-Fallback, CTA nur wenn `resolveCtaTarget.renderable`, Hero-Asset aus `assetMap` (`IMAGE_HERO`, sonst `VIDEO_HERO`). Fehlt das Asset: abstrakter CSS-Volume oder, wenn WebGL verfügbar und Motion erlaubt, eine lazy geladene Three.js-Leere (zwei Ebenen, Token-Licht). Kein Stockfoto.

GSAP: nur Hero-Intro (opacity / translateY / leichtes Scale), dynamic `import('gsap')`, nicht bei `prefers-reduced-motion`.

Three.js: nicht im Welcome/Wizard-Bundle. Nur wenn CHAMBER Preview ohne Hero-Asset gerendert wird.

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

## Architektur (Phase 8)

- `src/app` — Shell, Routing, Welcome, ProjectScreen
- `src/features/wizard` — 12-Step-Wizard
- `src/features/assets` — Logo-, Bild- und Video-Upload
- `src/features/generation` — Ritual, Recovery, Error
- `src/features/gallery` — Concept Cards, Structural Preview, Selection
- `src/renderers` — Renderer Contract, Registry, CHAMBER
- `src/generator` — Normalize, Section Planner, Asset Mapper, Concept Plans
- `src/store` — Project State, Generation-Session, Asset-Aktionen

Details: [ARCHITECTURE.md](./ARCHITECTURE.md)

## Datenschutz

Kundendaten und Assets bleiben im Browser. Keine externen AI-APIs, keine Uploads, keine Telemetrie.

## Netlify

Vorbereitet in `.netlify.toml`.

Kein Deploy in Phase 8.

## Lizenz

Privat / unveröffentlicht. `@imgly/background-removal` unterliegt der AGPL; siehe deren LICENSE.
