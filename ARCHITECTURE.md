# Architecture — Phase 21

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. Phase 17 ergänzt Standalone-Ansicht und ZIP-Export. CHAMBER, ATELIER, SIGNAL, REEL und IMPRINT bleiben finale Renderer. Project Schema bleibt Version 1.

CONTENT und PRESENTATION bleiben getrennt. Die Engine normalisiert, plant, mapped Assets und löst CTAs auf. Renderer erfinden keine Inhalte und schreiben keinen State.

## App Shell

Topbar unverändert, außer während `phase === generating`: Vollbild-Ritual ohne Topbar.

## Routing

`/` Welcome. `/project/:projectId` → `ProjectScreen` je nach `project.phase`. `/project/:projectId/view/:conceptId` → Standalone-Renderer ohne Topbar.

| phase      | Ansicht             |
| ---------- | ------------------- |
| wizard     | Wizard              |
| generating | Generation Screen   |
| gallery    | Concept Gallery     |
| selected   | Gallery + Selection |
| exported   | Gallery + Selection |

`view` ist eine zusätzliche URL für die Website-Ansicht. Exportierte ZIPs nutzen `site.html` / `index.html` außerhalb des App-Routers.

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

Karten: CHAMBER/SIGNAL laden sichtbare Mini-WebGL-Previews (DPR 1, IO-Pause). ATELIER/REEL/IMPRINT sind Miniaturen der finalen Komposition. Modal öffnet mit clip-path Expand aus der Card-Rect.

Filter: ALLE plus fünf Konzepte. Ansehen / Vollbild: Fokusfalle, Escape, Pfeiltasten.

Ansehen / Vollbild:

- `hasFinalRenderer(id)` → lazy `ConceptRenderer`
- CHAMBER → ChamberRenderer
- ATELIER → AtelierRenderer
- SIGNAL → SignalRenderer
- REEL → ReelRenderer
- IMPRINT → ImprintRenderer

ObjectURLs über `useAssetObjectUrl`. Lazy per IntersectionObserver in den Cards. Maximal eine aktive Video-Preview in der Gallery.

Regenerate: `regenerateConceptPlan(conceptId)` nur für eine Card.

Selection: `selectedConceptId` + `phase = selected`. Spätere Öffnung denselben Regeln.

Export:

- **Als Website öffnen** → Site-View, `previewMode = site`
- **Website exportieren** → ZIP der Standalone-Runtime plus Medien, danach `phase = exported`
- **Alle 5 exportieren** → ZIP mit Chooser und fünf HTML-Dateien

`src/export/` lädt `export-manifest.json` aus dem Production-Build. Dev ohne Manifest: Hinweis, kein Fake-Download.

## Renderer Contract

`src/renderers/types.ts`

Ein Renderer erhält mindestens:

- `project`
- `concept`
- `selectedConceptId`
- `previewMode` (`modal` | `fullscreen` | `site`)

Optional: `reducedMotion`, `onClose`.

Verbote: localStorage, IndexedDB, Project-Mutation, Generation, Asset-Remapping, Fake-Content, `any`, `Math.random()`, globale Side Effects.

Fehler: Error Boundary mit „Diese Vorschau konnte nicht geladen werden.“ und „Zur Galerie“. Boundary-Key ist `concept.id`. `site` nutzt native Hash-Navigation.

## Renderer Registry

`src/renderers/rendererRegistry.ts`

```
chamber → lazy ChamberRenderer
atelier → lazy AtelierRenderer
signal  → lazy SignalRenderer
reel    → lazy ReelRenderer
imprint → lazy ImprintRenderer
```

`ConceptRenderer` erzeugt `lazy()`-Wrapper aus der Registry und rendert den Loader zu `concept.id`. Chunks werden erst geladen, wenn die jeweilige Preview geöffnet wird.

Standalone-Runtime: `site.html` + `src/site/main.tsx`. Export injiziert `window.__LPS_SITE__` (Project, ConceptId, Media-Map).

## Asset Flow

```
GeneratedConcept.assetMap
→ slotId / mappedGallery / heroMediaId / videoSectionId
→ findProjectAsset(project, id)
→ useRendererAsset → useResolvedAssetUrl
   → App: IndexedDB ObjectURL
   → Export: relative media/ paths
→ URL in RendererMedia
```

`recommendedRatio` aus dem Mapping steuert Aspect Frames. Kein Remapping. Kein Base64. Fehlendes Asset: Placeholder.

## CHAMBER

`src/renderers/chamber/`

Dunkel, räumlich. Three.js-Welt über `createRendererRuntime`: PerspectiveCamera 50mm, authored Scroll-Kamerafahrt, Pointer-Damping nur Desktop, eigenes PMREM-Studio-Environment, ein transmissive MeshPhysical-Kristall, Intro-Shatter, Billboard-Brand. Hero-Media sitzt als Tafel in der Architektur, nicht statt der 3D-Welt. Overlay: Kicker oben rechts, Caption unten links, CTA unten rechts als Mono. DOM-Brand nur als Fallback ohne WebGL.

## ATELIER

`src/renderers/atelier/`

Luxury editorial. Kein Three.js. Accent als Wand. Masthead oben, Fotografie als Platte, Claim als Spalte, CTA als Bildunterschrift in Mono — nicht der gemeinsame unten-links-Hero.

## SIGNAL

`src/renderers/signal/`

Dunkel, kinetic. WebGL Displacement-Feld v2 (`SignalField`) mit velocity-force, exponential decay, Click-Ripple, 2-Oktaven-FBM, signed grid und sehr kleiner CA. Mobile senkt `uQuality`. Hero: Index-Strip oben, Brand zentriert-schräg, Status rechts, Terminal-CTA.

Plus Jakarta Sans für Headline, IBM Plex Mono für Kickers, Indizes, Nav und Contact.

Nav: stille tracked Wortmarke, ABOUT / SERVICES / WORK / VIDEO / TEAM / CONTACT nur wenn enabled. Kompakt, sticky, keine Floating-Bar.

Hero: full-bleed Field, Overlay-Type. `01 / Kategorie` wenn vorhanden, BrandMark, Claim oder Description, CTA wenn renderable. Asset aus `heroMediaId`. Ohne Asset: CSS-Fläche, kein Fake-Bild.

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

GSAP in `signalMotion.ts` via `import('gsap')`. Opacity, translateY, Media-Parallax. Kein Bounce, kein Scroll-Hijack. Preview-Anker: `scrollIntoView` im Preview-Container.

`prefers-reduced-motion`: kein GSAP, Video ohne Autoplay, sofortiger statischer Zustand.

## REEL

`src/renderers/reel/`

Cinematic, media-first. Kein Three.js. Hero-Video nutzt `CinematicVideo` (Text-Play/Pause, Scrub, Keyboard), nicht den nativen Browser-Player. Letterbox-Balken. Brand schwebt über dem Film. Keine neuen Hex-Farben.

Hero: Letterbox. Mit Film: Brand als Credit, CTA in der unteren Balken-Dock. Ohne Film: Title Card in der Bildmitte, kein unten-links-Stack.

Video-Section: nur `VIDEO_STORY` (`reelVideoSectionId`), damit das Hero-Video nicht dupliziert wird.

Gallery: filmstrip-artig, erstes Medium 21:9, weitere versetzt. Keine Captions.

Services: Credits-Liste. Team: Name/Rolle/Bio, Bild nur gemappt. CTA: echtes Label, große Serif-Zeile.

Motion: `reelMotion.ts`, Directed Intro (Letterbox, Media-Crop, Brand), Scroll-Reveal, Parallax. Kein Bounce, kein Scroll-Hijack.

## IMPRINT

`src/renderers/imprint/`

Monumental, typografisch, editorial branding. Kein Three.js. Keine neuen Hex-Farben.

Instrument Serif für Brandname, Hero-Statement, große Statements und CTA. Plus Jakarta Sans für Body und Beschreibungen. IBM Plex Mono für Indizes, Kickers, stille Nav und kleine Labels.

Hero: `BrandMark` mit `KineticText`, Logo als Wasserzeichen, Claim oder Description als Fallback (nicht doppelt). Asset aus `heroMediaId` (`IMAGE_HERO` vor `VIDEO_HERO`). Ohne Asset: typografischer Hero ohne Fake-Bild. Overflow aus dem Viewport. Scroll skaliert die Mark.

Nav: stille tracked Wortmarke. ABOUT / WORK / SERVICES / VIDEO / TEAM / CONTACT nur wenn enabled. Sticky, kompakt mobil.

Gallery: Editorial-Archiv aus `mappedGallery`, unregelmäßige Medienflächen, `recommendedRatio`, Index-Chrome, keine Fake-Captions.

Video: `videoSectionId`, nur wenn enabled und zugewiesen. Nicht duplizieren wenn Hero das einzige Video zeigt.

Services: typografische Liste. Story: großes Statement aus vorhandenem Text. Team: nur echte Personen und gemappte Bilder. CTA: große Serif-Zeile, nur `resolveCtaTarget`. Contact/Footer: nur echte Felder über `contactLinks.ts`.

Motion: `imprintMotion.ts`, Directed Intro (Zeichen-Stagger), Brand-Scroll, Media-Parallax. Kein Bounce, kein Scroll-Hijack.

`prefers-reduced-motion`: kein GSAP, Video ohne Autoplay, statischer Zustand.

## Persistenz

Unverändert: LocalStorage JSON, IndexedDB Blobs. Keine Schema-Erweiterung.

## CTA

`resolveCtaTarget`. Nicht renderbare CTAs erscheinen nicht als Aktion.

## Welcome / Continue

Continue öffnet `/project/:id`. ProjectScreen routet anhand phase.

Demo NOIR nutzt dieselbe Pipeline.

## Motion System

`src/motion/` definiert Directed Intros pro Renderer, Brand-Scroll, Signal-Brand, Scroll-Reveal, Nav-Shrink und Media-Parallax. `BrandMark` ist das Kompositionsobjekt für Logo und Wortmarke.

## Bewusst nicht in Phase 18

Netlify-Deploy der Kundenseite, GitHub-Push der Kundenseite, AI-APIs, Schema-Migration, Accounts, Payments, Three.js für IMPRINT.
