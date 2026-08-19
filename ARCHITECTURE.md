# Architecture — Phase 6

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. Phase 6 ergänzt die Generation Engine Foundation. Project Schema bleibt Version 1.

CONTENT und PRESENTATION bleiben getrennt. Die Engine kennt keine Concept-Renderer.

## App Shell

Unverändert: Topbar, LocalStorage-Hinweis, IndexedDB-Hinweis. Keine Sidebar.

## Routing

Unverändert. `/` Welcome, `/project/:projectId` Wizard.

## Wizard

Navigation, Skip, Autosave, Review Deep-Links und Wordmark-Leave sind unverändert.

Review-CTA ruft die Engine auf und speichert `generatedConcepts`. `project.phase` bleibt `wizard`. Kein Generation-Screen, keine Gallery, kein Preview.

## Persistenz

| Daten         | Ort                                            | Modul                  |
| ------------- | ---------------------------------------------- | ---------------------- |
| Project JSON  | LocalStorage `lps.project.v1`                  | `src/utils/storage.ts` |
| Binary Assets | IndexedDB DB/Store `lps-assets`, Key `blobKey` | `src/utils/assetDb.ts` |

Keine Base64-Persistenz. ObjectURLs nur für Preview. Die Engine liest keine Blobs.

## Generation Pipeline

```
Project Data
→ normalizeProject
→ validateGenerationData
→ mapAssets (Metadaten, concept-spezifisch)
→ buildSectionPlan
→ 5 × GeneratedConcept
→ Renderer später
```

Reine Funktionen in `src/generator/`. Der Store enthält die Engine nicht. Dünne Actions:

- `buildGenerationPlan()`
- `regenerateConceptPlan(conceptId)`

## Section Planner

Katalog: hero, nav, about, services, gallery, video, story, team, cta, contact, footer.

Immer: hero, nav, cta, footer.

Datengesteuert: about, services, gallery (≥ 3 Restbilder nach Priority-Mapping), video, story, team, contact.

Nicht im Katalog: faq, testimonials, proof, awards.

Keine erfundenen Sections, Zahlen, Reviews oder Stockbilder.

## Asset Mapping

Priority:

1. explizite User-Zuordnung (`imageId`)
2. Hero
3. Person / Team
4. Services
5. About
6. Gallery (max. 8, User-Reihenfolge)

Logo: `logo.selected === "transparent"` und vorhanden → `LOGO_TRANSPARENT`, sonst Original, sonst null.

Hero-Score: Pixelfläche + Landscape/Wide-Boni + kleiner User-Order-Bonus. Concept-Regeln für CHAMBER / ATELIER / SIGNAL / REEL / IMPRINT.

Kein Crop in Phase 6. Mapping speichert nur `recommendedRatio` / `recommendedPx`.

## CTA Resolution

Intern `resolveCtaTarget`. Keine toten Buttons: fehlt das Ziel, ist `href` null und `renderable` false. Die CTA-Section existiert trotzdem.

## Seeds / Regenerate

Seed = stabiler Hash aus `project.id` + `conceptId`.

Gleicher Project-State + gleicher Seed → gleicher SectionPlan und gleiches Mapping.

Regenerate ändert nur Seed und optionales Gallery-Jitter. Kundendaten, Hero-Wahl und übrige Priority-Slots bleiben stabil, soweit die Daten das zulassen.

## Logo Flow

Unverändert aus Phase 5. Mapping verwendet nur Logo-Metadaten und `logo.selected`.

## ObjectURL Lifecycle

Unverändert `src/utils/objectUrls.ts` / `useAssetObjectUrl`. Generation erzeugt keine ObjectURLs.

## Store

`useProjectStore` unverändert in der öffentlichen API. Generation-Aktionen in `src/store/generationActions.ts`.

## i18n

Deutsch. Review unverändert.

## Demo

NOIR bleibt ohne Binaries. Die Engine kann den Demo-Textstand trotzdem planen.

## Bewusst nicht in Phase 6

Three.js, GSAP, Concept Renderer, Gallery UI, Fullscreen Preview, ZIP-Export, AI-Copy, externe AI-APIs, Accounts, Payments, Netlify-Deploy, GitHub, Schema-Migration.
