# Architecture — Phase 3

Landingpage Studio AI trennt die Generator-App von später generierten Landingpages. In Phase 3 existieren App-Shell, Welcome und der Eingabe-Wizard.

## App Shell

`AppShell` ist das dunkle Werkzeug-Chrome: Topbar, optionale Speicher-Hinweise, Hauptfläche. Keine Sidebar, kein Dashboard.

Im Wizard fängt das Wordmark einen Klick ab. Bestätigung: Projekt bleibt gespeichert, zurück zur Startseite oder bleiben.

## Routing

| Pfad                  | Screen               |
| --------------------- | -------------------- |
| `/`                   | Welcome              |
| `/project/:projectId` | Wizard (12 Steps)    |
| alles andere          | Redirect auf Welcome |

Unbekannte Routen führen zurück zur Welcome-Seite. Eine fremde `projectId` wird auf das gespeicherte Projekt umgebogen. Fehlt ein Projekt, Redirect auf Welcome.

## Wizard

`src/features/wizard` ist die einzige Eingabefläche.

- Fortschritt `01 / 12`, nicht frei klickbar
- Eine Frage pro Step
- Zurück / Weiter / Überspringen (nur optionale Steps)
- Review: Deep-Links zum jeweiligen Step
- Step 01 Zurück: Welcome, nicht destruktiv
- Review-CTA „Meine Konzepte erzeugen“: Validierung + Flush der Persistenz. Keine Generation.

Autosave: 250 ms Debounce bei Feldänderungen. Sofortiges Schreiben bei Step-Wechsel, Verlassen und `beforeunload`.

Leere Leistungen, Team-Karten und Extra-Links werden beim Verlassen eines Steps entfernt. Eingegebene Inhalte bleiben erhalten.

Medien-Steps (Logo, Bilder, Videos) sind in Phase 3 leere Zustände plus Skip. Upload folgt in Phase 4.

## Store

`useProjectStore` (Zustand) hält genau ein Projekt im MVP.

Methoden:

- `createProject()`
- `loadProject()`
- `loadDemoProject()`
- `updateProject()` — Nested-Merge, Debounce 250 ms
- `deleteProject()`
- `setPhase()`
- `setStep()` — sofort persistieren
- `flushPersist()`
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
Keine Konzepte, keine Landingpage-Generation in Phase 3.

## Bewusst nicht in Phase 3

Upload, Logo-Freisteller, Three.js, Generation, Preview, ZIP-Export, Accounts, Payments.
