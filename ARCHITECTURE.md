# Architecture — Phase 8

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. Phase 8 ergänzt eine Renderer-Schicht und den finalen CHAMBER-Renderer. Project Schema bleibt Version 1.

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

Karten: Structural Preview, CSS-only, keine Three.js-Vorwegnahme.

Ansehen / Vollbild:

- `hasFinalRenderer(id)` → lazy `ConceptRenderer` (aktuell nur CHAMBER)
- sonst Structural Preview (ATELIER, SIGNAL, REEL, IMPRINT)

ObjectURLs über `useAssetObjectUrl`. Lazy per IntersectionObserver in den Cards. Maximal eine aktive Video-Preview in der Gallery.

Regenerate: `regenerateConceptPlan(conceptId)` nur für eine Card.

Selection: `selectedConceptId` + `phase = selected`, Badge „AUSGEWÄHLT“. Spätere Öffnung derselben Regeln: CHAMBER final, andere structural.

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

Fehler: Error Boundary mit „Diese Vorschau konnte nicht geladen werden.“ und „Zur Galerie“. Die App bleibt bedienbar.

## Renderer Registry

`src/renderers/rendererRegistry.ts`

```
chamber → lazy ChamberRenderer
atelier / signal / reel / imprint → nicht implementiert
```

Keine Fake-Landingpages für die vier offenen Konzepte. Interfaces und Registry sind vorbereitet.

`ConceptRenderer` lädt den CHAMBER-Chunk erst beim Öffnen der Preview. Die Gallery importiert `ConceptRenderer` selbst lazy.

## Asset Flow

```
GeneratedConcept.assetMap
→ slotId / gallerySlotIds / heroMediaId
→ findProjectAsset(project, id)
→ useRendererAsset → useAssetObjectUrl(blobKey)
→ ObjectURL in RendererMedia
```

Kein Base64, keine DataURLs, keine direkten DB-Aufrufe im Renderer. Fehlendes Asset: ruhiger Placeholder, kein Broken-Image.

## CHAMBER

`src/renderers/chamber/`

Sections folgen `concept.sectionPlan`. Disabled oder leere Sections werden nicht gerendert.

Reihenfolge: Nav (reduziert, sticky, keine Glass-Bar), Hero, About, Services, Gallery, Video, Story, Team, CTA, Contact, Footer.

Daten nur aus Project + Concept:

- Hero: Brandname, Claim oder Description, CTA wenn renderable, `IMAGE_HERO` sonst `VIDEO_HERO`
- About: vorhandene About-/Story-Felder, keine Verdopplung der Hero-Description ohne Claim
- Services: `project.services`, Preise nur wenn vorhanden, editorial list
- Gallery: echte `GALLERY_*`-Assets, asymmetrisches Grid
- Video: `VIDEO_STORY` oder `VIDEO_HERO`, wenn das Hero bereits das einzige Video zeigt nicht duplizieren
- CTA: `resolveCtaTarget`
- Contact / Social / Footer: nur echte Felder, korrekte `mailto` / `tel` / `https` / WhatsApp-Links

CSS Modules, Phase-1-Tokens, keine neuen Hex-Farben, keine Gradients, kein Glassmorphism, kein Neon.

### Motion

GSAP nur im Hero-Intro (`chamberMotion.ts`, `import('gsap')`). Opacity, translateY, leichtes Media-Scale. Kein Bounce, kein Scroll-Hijacking. Preview-Anker scrollen mit `scrollIntoView` im Preview-Container.

`prefers-reduced-motion`: kein GSAP, kein Three.js-Loop, Video ohne Autoplay.

### Three.js

Nur als abstrakte architektonische Leere, wenn kein Hero-Asset existiert, WebGL verfügbar ist und Motion erlaubt ist. Lazy `import('./ChamberVoid')`. Zwei Ebenen, Token-Licht, langsame Kamerabewegung aus `elapsed` (kein `Math.random()`). Canvas `aria-hidden`. WebGL-Fehler oder Context Lost → CSS-Fallback. Die Information der Seite steht in HTML (eine `h1`, Texte, Links).

Welcome, Wizard, Structural Preview und Gallery-Karten laden Three.js nicht.

## Persistenz

Unverändert: LocalStorage JSON, IndexedDB Blobs. Keine Schema-Erweiterung.

## CTA

`resolveCtaTarget`. Nicht renderbare CTAs erscheinen nicht als Aktion.

## Welcome / Continue

Continue öffnet `/project/:id`. ProjectScreen routet anhand phase.

Demo NOIR nutzt dieselbe Pipeline.

## Zukünftige Renderer

ATELIER, SIGNAL, REEL, IMPRINT: Loader in der Registry ergänzen. Contract und Shared Media bleiben. Keine Fake-Renderer in Phase 8.

## Bewusst nicht in Phase 8

Finale Renderer für ATELIER / SIGNAL / REEL / IMPRINT, ZIP-Export, Netlify-Deploy, GitHub-Push der Kundenseite, AI-APIs, Schema-Migration, Accounts, Payments.
