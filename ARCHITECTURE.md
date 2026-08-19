# Architecture — Phase 5

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. In Phase 5 kommt lokale Logo-Freistellung hinzu. Project Schema bleibt Version 1.

## App Shell

Unverändert: Topbar, LocalStorage-Hinweis, IndexedDB-Hinweis. Keine Sidebar.

## Routing

Unverändert. `/` Welcome, `/project/:projectId` Wizard.

## Wizard

Navigation, Skip, Autosave, Review Deep-Links und Wordmark-Leave sind unverändert. Logo-Processing blockiert keine Steps.

## Persistenz

| Daten         | Ort                                            | Modul                  |
| ------------- | ---------------------------------------------- | ---------------------- |
| Project JSON  | LocalStorage `lps.project.v1`                  | `src/utils/storage.ts` |
| Binary Assets | IndexedDB DB/Store `lps-assets`, Key `blobKey` | `src/utils/assetDb.ts` |

Keine Base64-Persistenz. ObjectURLs nur für Preview.

## Logo Flow

```
File
→ Validation (bestehende Phase-4-Regeln, 12 MB)
→ IndexedDB Original (LOGO_ORIGINAL)
→ Project.logo.status = processing (Raster) / ready (SVG)
→ Local Background Removal (@imgly/background-removal, Worker)
→ IndexedDB Transparent (LOGO_TRANSPARENT, PNG + Alpha)
→ Project.logo.selected (original | transparent)
```

Sicherheitsprinzip beim Ersetzen:

NEW FIRST → VERIFY (Blob lesbar) → REPLACE JSON → CLEANUP alte Logo-blobKeys.

Scheitert der neue Original-Upload, bleibt das bisherige Logo.

SVG: kein Removal, kein Raster, `selected = original`, `status = ready`.

## Timeout / Retry / Cleanup

- Timeout 20 Sekunden. Danach `status = failed`, Original bleibt, bestehendes Transparent bleibt.
- Retry verwendet denselben Original-Blob. Kein zweites Original.
- Erfolgreicher Retry ersetzt nur `LOGO_TRANSPARENT`.
- Löschen entfernt ausschließlich die Logo-blobKeys, nie IMAGE_/VIDEO_-Assets.
- Job-Token: veraltete Ergebnisse nach Replace, Delete, Timeout oder Retry werden verworfen.
- Unmount der Step-Komponente bricht Processing nicht ab.

## ObjectURL Lifecycle

Unverändert `src/utils/objectUrls.ts` / `useAssetObjectUrl`. Processing erzeugt keine dauerhaften URLs im Project-State.

## Store

`useProjectStore` unverändert in der öffentlichen API. Logo-Aktionen in `src/store/assetActions.ts`, Processing in `src/utils/logoKnockout.ts`.

## i18n

Deutsch. Review zeigt weiterhin nur „Logo: 1 vorhanden“, keine Processing-Details.

## Demo

NOIR bleibt ohne Binaries.

## Bewusst nicht in Phase 5

Three.js, GSAP, Generation, Gallery, Preview Engine, ZIP-Export, AI-Copy, Accounts, Payments, Netlify-Deploy, GitHub, Schema-Migration.
