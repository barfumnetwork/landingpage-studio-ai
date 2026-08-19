# Architecture — Phase 2

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. In Phase 2 existiert nur die App-Shell.

## App Shell

`AppShell` ist das dunkle Werkzeug-Chrome: Topbar, optionale Speicher-Hinweise, Hauptfläche. Keine Sidebar, kein Dashboard.

## Routing

| Pfad                  | Screen                              |
| --------------------- | ----------------------------------- |
| `/`                   | Welcome                             |
| `/project/:projectId` | Placeholder für den späteren Wizard |
| alles andere          | Redirect auf Welcome                |

Unbekannte Routen führen zurück zur Welcome-Seite.

## Store

`useProjectStore` (Zustand) hält genau ein Projekt im MVP.

Methoden:

- `createProject()`
- `loadProject()`
- `loadDemoProject()`
- `updateProject()`
- `deleteProject()`
- `setPhase()`
- `setStep()`
- `discardCorrupt()`

Persistenz schreibt JSON nach LocalStorage. Binaries / IndexedDB kommen später.

## Storage

`src/utils/storage.ts` ist die einzige Stelle mit `localStorage`. Komponenten sprechen den Store an, nicht den Browser-Storage.

Wenn Storage fehlt, startet die App trotzdem. Hinweis in der Shell.

Wenn JSON korrupt ist: eigene Fehlerfläche, kein White Screen.

## i18n

UI-Sprache ist Deutsch (`src/i18n/de.ts`).  
Typen in `src/i18n/types.ts`, damit später weitere Locales möglich sind.  
Landingpage-Inhalte kommen aus den Projektdaten und sind unabhängig von der App-Sprache.

## Design Tokens

`src/styles/tokens.css` ist die Quelle für Farbe, Typo, Spacing, Radius, Elevation, Motion.  
Komponenten verwenden diese Custom Properties. Keine eigenen Hex-Werte in Screens.

## Demo

`src/data/demoNoir.ts` erzeugt ein befülltes Projekt **NOIR** mit Claim _Designed for the extraordinary._  
Keine Konzepte, keine Landingpage-Generation in Phase 2.

## Bewusst nicht in Phase 2

Wizard, Upload, Logo-Freisteller, Three.js, Generation, Preview, ZIP-Export, Accounts, Payments.
