# Architecture — Phase 4

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. In Phase 4 existieren App-Shell, Welcome, Wizard und lokaler Asset-Upload.

## App Shell

`AppShell` ist das dunkle Werkzeug-Chrome: Topbar, optionale Speicher-Hinweise, Hauptfläche. Keine Sidebar, kein Dashboard.

Zwei unabhängige Hinweise:

- LocalStorage nicht verfügbar
- IndexedDB nicht verfügbar

Im Wizard fängt das Wordmark einen Klick ab. Bestätigung: Projekt bleibt gespeichert.

## Routing

| Pfad                  | Screen            |
| --------------------- | ----------------- |
| `/`                   | Welcome           |
| `/project/:projectId` | Wizard (12 Steps) |
| alles andere          | Redirect Welcome  |

## Wizard

`src/features/wizard` bleibt die Eingabefläche. Navigation, Skip, Autosave und Review aus Phase 3 sind unverändert.

Steps 02–04 zeigen jetzt Upload statt Empty-Placeholder. Skip bleibt möglich.

## Persistenz

Saubere Trennung:

| Daten         | Ort                                            | Modul                  |
| ------------- | ---------------------------------------------- | ---------------------- |
| Project JSON  | LocalStorage `lps.project.v1`                  | `src/utils/storage.ts` |
| Binary Assets | IndexedDB DB/Store `lps-assets`, Key `blobKey` | `src/utils/assetDb.ts` |

Keine Base64-Dateien in LocalStorage. `AssetFile` im JSON enthält nur Metadaten plus `blobKey`.

Autosave: 250 ms Debounce bei Feldänderungen. Asset-Mutationen rufen zusätzlich `flushPersist()` auf.

Reload: JSON aus LocalStorage, Blobs aus IndexedDB, ObjectURLs nur zur Preview.

## Assets

`src/features/assets` und `src/store/assetActions.ts`.

- Logo: Original bleibt unangetastet. SVG wird nicht gerastert. Optionales PNG mit Transparenz. Auswahl Original / Transparent. Automatisches Freistellen ist vorbereitet (Status + UI), läuft in Phase 4 nicht.
- Bilder: PNG/JPG/WEBP, max 12 MB, IDs `IMAGE_01` … nach User-Reihenfolge, Drag-and-Drop plus Nach oben/unten.
- Videos: MP4/WEBM, hart 80 MB, IDs `VIDEO_01` …, Preview muted/playsinline/loop, max. 3 gleichzeitig, Offscreen pause.

ObjectURLs: `src/utils/objectUrls.ts`. Retain/Release. Revoke beim Unmount und Löschen. IndexedDB-Blob bleibt beim Revoke erhalten.

Fehler je Datei: unsupported, too-large, read, quota. Ein Fehler bricht den Rest nicht ab.

## Store

`useProjectStore` hält ein Projekt. Nested-Merge unverändert. Löschen / Neu / Demo entfernt zugehörige Blobs anhand der `blobKey`s im aktuellen JSON.

## i18n

UI-Sprache Deutsch (`src/i18n/de.ts`).

## Design Tokens

`src/styles/tokens.css`. Keine eigenen Hex-Werte in Screens.

## Demo

NOIR bleibt Text-Demo ohne Binaries.

## Bewusst nicht in Phase 4

Automatisches Logo-Freistellen (ML), Three.js, GSAP, Generation, Concept Gallery, Preview Engine, ZIP-Export, AI, Accounts, Payments, Netlify-Deploy, GitHub.
