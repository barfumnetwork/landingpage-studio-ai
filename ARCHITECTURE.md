# Architecture — Phase 7

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. Phase 7 verdrahtet die Engine aus Phase 6 mit Generation Experience und Structural Gallery. Project Schema bleibt Version 1.

CONTENT und PRESENTATION bleiben getrennt. Keine finalen Concept-Renderer.

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

Structural Preview: CSS-only, concept-spezifisch, keine Three.js-Vorwegnahme.

ObjectURLs über `useAssetObjectUrl`. Lazy per IntersectionObserver. Maximal eine aktive Video-Preview.

Regenerate: `regenerateConceptPlan(conceptId)` nur für eine Card.

Selection: `selectedConceptId` + `phase = selected`, Badge „AUSGEWÄHLT“.

Export-Buttons disabled, kein Download.

## Persistenz

Unverändert: LocalStorage JSON, IndexedDB Blobs.

## CTA

`resolveCtaTarget`. Nicht renderbare CTAs erscheinen nicht als Aktion.

## Welcome / Continue

Continue öffnet `/project/:id`. ProjectScreen routet anhand phase.

Demo NOIR nutzt dieselbe Pipeline.

## Bewusst nicht in Phase 7

Three.js, GSAP, finale Renderer, ZIP-Export, Netlify-Deploy, GitHub, AI-APIs, Schema-Migration, Accounts, Payments.
