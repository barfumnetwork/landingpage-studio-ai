# Architecture — Phase 10

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. Phase 10 ergänzt den finalen SIGNAL-Renderer. CHAMBER und ATELIER bleiben. Project Schema bleibt Version 1.

CONTENT und PRESENTATION bleiben getrennt. Die Engine normalisiert, plant, mapped Assets und löst CTAs auf. Renderer erfinden keine Inhalte und schreiben keinen State.

## App Shell

Topbar unverändert, außer während `phase === generating`: Vollbild-Ritual ohne Topbar.

## Routing

`/` Welcome. `/project/:projectId` → `ProjectScreen` je nach `project.phase`:

| phase      | Ansicht             |
| ---------- | ------------------- |
| wizard     | Wizard              |
| generating | Generation Screen   |
| gallery    | Concept Gallery     |
| selected   | Gallery + Selection |
| exported   | Gallery + Selection |

Keine neuen URLs.

## Generation Flow

```
Review CTA
→ prune + flush
→ startGeneration()        phase = generating, Job-Token
→ generateProjectConcepts  (echt, parallel zum Ritual)
→ 8 Phasen mit Mindestdauer
→ Progress hält ~95 % bis Engine-Ergebnis
→ READY + Accent-Flash
→ completeGeneration()     nur vollständiges GeneratedConcept[]
→ phase = gallery
```

Scheitert die Engine: `failGeneration()`, keine Concept-Überschreibung, User-Daten bleiben.

Reload bei `phase === generating` und Session `idle`: Recovery. Keine Fake-Fortsetzung.

## Generation State

Persistiert nur `project.phase` und `generatedConcepts`.

Session-only im Store (nicht LocalStorage):

- `generationStatus`: idle | running | error
- `generationRunId`
- `regeneratingConceptId`
- `regenerateError`

Ein Lauf gleichzeitig. Zweiter Start wird ignoriert.

## Gallery

Cards lesen gespeicherte Concepts. Kein erneutes Mapping.

Karten: Structural Preview, CSS-only. Finale Renderer und Three.js werden dort nicht geladen.

Ansehen / Vollbild:

- `hasFinalRenderer(id)` → lazy `ConceptRenderer`
- CHAMBER → ChamberRenderer
- ATELIER → AtelierRenderer
- SIGNAL → SignalRenderer
- REEL / IMPRINT → Structural Preview

ObjectURLs über `useAssetObjectUrl`. Lazy per IntersectionObserver in den Cards. Maximal eine aktive Video-Preview in der Gallery.

Regenerate: `regenerateConceptPlan(conceptId)` nur für eine Card.

Selection: `selectedConceptId` + `phase = selected`. Spätere Öffnung denselben Regeln.

Export-Buttons disabled, kein Download.

## Renderer Contract

`src/renderers/types.ts`

Ein Renderer erhält mindestens:

- `project`
- `concept`
- `selectedConceptId`
- `previewMode` (`modal` | `fullscreen`)

Optional: `reducedMotion`, `onClose`.

Verbote: localStorage, IndexedDB, Project-Mutation, Generation, Asset-Remapping, Fake-Content, `any`, `Math.random()`, globale Side Effects.

Fehler: Error Boundary mit „Diese Vorschau konnte nicht geladen werden.“ und „Zur Galerie“. Boundary-Key ist `concept.id`.

## Renderer Registry

`src/renderers/rendererRegistry.ts`

```
chamber → lazy ChamberRenderer
atelier → lazy AtelierRenderer
signal  → lazy SignalRenderer
reel / imprint → nicht implementiert
```

`ConceptRenderer` erzeugt `lazy()`-Wrapper aus der Registry und rendert den Loader zu `concept.id`. Chunks werden erst geladen, wenn die jeweilige Preview geöffnet wird.

## Asset Flow

```
GeneratedConcept.assetMap
→ slotId / mappedGallery / heroMediaId / videoSectionId
→ findProjectAsset(project, id)
→ useRendererAsset → useAssetObjectUrl(blobKey)
→ ObjectURL in RendererMedia
```

`recommendedRatio` aus dem Mapping steuert Aspect Frames. Kein Remapping. Kein Base64. Fehlendes Asset: Placeholder.

## CHAMBER

`src/renderers/chamber/`

Dunkel, architektonisch. Optional Three.js-Leere, wenn kein Hero-Asset, WebGL und Motion erlaubt. GSAP nur Hero-Intro.

## ATELIER

`src/renderers/atelier/`

Editorial, warm, galerieartig. Kein Three.js. Accent als Wand. Instrument Serif führt.

## SIGNAL

`src/renderers/signal/`

Dunkel, editorial-tech, strukturiert. Kein Three.js. Keine neuen Hex-Farben.

Plus Jakarta Sans für Headline, IBM Plex Mono für Kickers, Indizes, Nav und Contact. Linien, Raster, nummerierte Bereiche (`01 / ABOUT`).

Nav: Brand/Logo, ABOUT / SERVICES / WORK / VIDEO / TEAM / CONTACT nur wenn enabled. Kompakt, sticky, keine Floating-Bar.

Hero: Copy links, Media-Modul rechts. `01 / Kategorie` wenn vorhanden, Brandname, Claim oder Description, CTA wenn renderable. Asset aus `heroMediaId`. Ohne Asset: CSS-Fläche (`--app-surface`), kein Fake-Bild.

Sections folgen `sectionPlan`. Disabled oder leer → nicht rendern.

- About: Brandname als Statement, keine Hero-Description-Verdopplung ohne Claim
- Services: nummerierte Zeilen, Preise nur wenn vorhanden
- Gallery: erstes Medium groß, weitere im Raster, Index-Chrome, keine Fake-Captions
- Video: `videoSectionId`, nicht duplizieren wenn Hero das einzige Video zeigt
- Story: vorhandener Text als Statement
- Team: Name/Rolle/Bio wenn vorhanden, Bild nur bei Mapping
- CTA: nur `resolveCtaTarget`, Label aus Project
- Contact / Footer / Social: nur echte Felder

### Motion

GSAP in `signalMotion.ts` via `import('gsap')`. Opacity, translateY, clip-path wipe am Media-Modul. Kein Bounce, kein Scroll-Hijack. Preview-Anker: `scrollIntoView` im Preview-Container.

`prefers-reduced-motion`: kein GSAP, Video ohne Autoplay, sofortiger statischer Zustand.

## Persistenz

Unverändert: LocalStorage JSON, IndexedDB Blobs. Keine Schema-Erweiterung.

## CTA

`resolveCtaTarget`. Nicht renderbare CTAs erscheinen nicht als Aktion.

## Welcome / Continue

Continue öffnet `/project/:id`. ProjectScreen routet anhand phase.

Demo NOIR nutzt dieselbe Pipeline.

## Zukünftige Renderer

REEL, IMPRINT: Loader in der Registry ergänzen. Contract und Shared Media bleiben.

## Bewusst nicht in Phase 10

Finale Renderer für REEL / IMPRINT, ZIP-Export, Netlify-Deploy, GitHub-Push der Kundenseite, AI-APIs, Schema-Migration, Accounts, Payments, Three.js für SIGNAL.
