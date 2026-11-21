---
name: Robin – Garden Journal
description: Ein Gartentagebuch aus Papier, Tinte, Stempeln und Holz – Lernzeit wird zu einem Garten, den man selbst gepflanzt hat.
colors:
  canvas: "#FBF7EF"
  paper: "#F7F0E1"
  paper-deep: "#EEE3CC"
  paper-line: "#DED0B4"
  ink: "#3B3A36"
  ink-muted: "#69645A"
  tape-honey: "rgba(236, 214, 158, 0.65)"
  tape-sage: "rgba(184, 204, 176, 0.6)"
  stamp-green: "#4A7250"
  stamp-rust: "#A4503A"
  stamp-blue: "#3E5A7E"
  wood-ink: "#36200F"
  primary: "#4CA65A"
  primary-ink: "#2F6B3A"
  coin: "#F2B33D"
  xp: "#C77B3C"
  xp-deep: "#8F4F22"
  accent-gold: "#C9A227"
  error-deep: "#A93F35"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  numbers:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "tnum"
  label:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.3
  hand:
    fontFamily: "Caveat, cursive"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  object: "4px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "20px"
  space-5: "28px"
  space-6: "40px"
  space-7: "56px"
  space-8: "80px"
components:
  paper-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "{spacing.space-3}"
  label-tag:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "{spacing.space-2}"
  button-primary:
    textColor: "{colors.wood-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.object}"
    height: "44px"
    padding: "0 {spacing.space-4}"
  button-secondary:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.object}"
    height: "44px"
    padding: "0 {spacing.space-4}"
  text-input:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: "44px"
  robin-note:
    textColor: "{colors.stamp-blue}"
    typography: "{typography.hand}"
---

# Design System: Robin – Garden Journal

<!-- Aus dem fertigen System abgeleitet (Skill `robin-design`, Tokens in `app/robin-theme.css`, Bausteine in `components/journal/`, Testseite `/dev/components`, Stand 2026-11-17). Bei Konflikt gilt `robin-design`. Die Live-App nutzt bis zur Umstellung noch das alte Design (Baloo 2 / Quicksand, weiße Karten); dieses Dokument beschreibt das neue. -->

## Overview

**Creative North Star: „Robins Gartentagebuch“.** Robin ist ein reisender Gärtner; die ganze Oberfläche ist sein Journal, in dem Papier, Tinte, Stempel und Klebeband festhalten, was ihr gemeinsam gepflanzt habt. Nichts davon ist Dekoration um eine Dashboard-App herum – das Material *ist* die Oberfläche. Leitsatz: *Du lernst, ihr pflanzt, das Journal erinnert sich.*

Drei Ebenen bestimmen das Material: die **Reise** (Robin legt an jedem Ort einen Garten an, nie je Welt anders), das **Journal** (Papier, Tinte, Etiketten, Klebeband, Handschrift; weltunabhängig) und der **Ort** (Garden und Nursery tragen das Material des Ortes, in Welt 1 Holz). Alles, was *über dich* ist, lebt im Journal; alles, was *an einem Ort* ist, im Material des Ortes.

Der Ton ist warm, handgemacht und ruhig. Lernen und Formulare bleiben still; **Belohnung ist laut** (XP, Coins, Level-up, erste Blüte). Der Studyroom ist Robins Arbeitstisch im Garten: oben der lebendige Garten, unten Journalzettel.

**Key Characteristics:**
- Papier ist ein Asset (gerissene Ränder, 9-Slice), keine CSS-Fläche; Tiefe entsteht durch Material, nicht durch Kartenschatten.
- Alle Tinte ist von Hand gezeichnet (leichter Wackler), nie eine exakte CSS-Linie.
- Gedrucktes (Stempel, Linien im Linienpapier) ist die einzige Ausnahme, und sieht auch gedruckt aus.
- Text steht nie direkt auf Illustration, immer auf Papier oder Etikett.
- Kein SaaS-Dashboard, kein Glassmorphism, kein Fotorealismus, kein Comic-Overload.

## Colors

Eine warme, erdige Basis (Sand und Pergament, nie reines Weiß oder Schwarz) mit einem gedämpften Grün für Wachstum. Neue Farben kommen nur als Tokens in `app/robin-theme.css`, nie inline.

### Primary
- **Wachstumsgrün** (`primary` #4CA65A): Wachstum, aktive Navigation, Fortschritt. Weißer Text darauf nur auf der dunkleren Variante (`primary-deep`, 4,70:1), nie auf `primary` (3,04:1).
- **Grüne Tinte** (`primary-ink` #2F6B3A): grüner Text auf hellen Flächen.

### Secondary
- **Gartenstempel-Grün** (`stamp-green` #4A7250): verblasstes Grün für Garten-Stempel (4,85:1 auf Papier).
- **Rostrot** (`stamp-rust` #A4503A): Daten und Stempel (4,89:1 auf Papier); nie für Robins Stimme.
- **Füllertinten-Blau** (`stamp-blue` #3E5A7E): Robins Stimme und blaue Stempel (6,23:1 auf Papier).

### Tertiary
- **Münzgold** (`coin` #F2B33D) und **Kupfer** (`xp` #C77B3C, Rinne `xp-deep` #8F4F22): Coins und XP erscheinen fast immer nebeneinander und sind immer an Farbe *und* Icon zu unterscheiden.
- **Seltenes Gold** (`accent-gold` #C9A227): nur für seltene Momente (Streak-Meilenstein 7/30/100, Signature-Items).

### Neutral
- **Canvas** (`canvas` #FBF7EF): App-Hintergrund hinter dem Garten.
- **Papier** (`paper` #F7F0E1), **Papier dunkel** (`paper-deep` #EEE3CC), **Papierlinie** (`paper-line` #DED0B4, nur dekorativ, nie für Text).
- **Tinte** (`ink` #3B3A36, 10,03:1 auf Papier) und **gedämpfte Tinte** (`ink-muted` #69645A, 5,18:1 auf Papier) für Sekundärtext. Das ältere `ink-soft` (#7A756B) reicht auf Papier nicht (4,04:1) und ist nur Legacy.
- **Klebeband** (`tape-honey`, `tape-sage`, je ca. 0,6 Alpha) und **eingebranntes Holzbraun** (`wood-ink` #36200F) für die Schrift auf dem Holzschild.
- **Fehlerrot** (`error-deep` #A93F35, 5,37:1 auf Papier) ist die einzige Fehlerfarbe für Text; das hellere `error` (2,87:1) ist für Text tabu.

**The Eine-Tinte Rule.** Rostrot gehört den Daten und dem Stempel, Blau gehört Robin, Schwarzbraun (`ink`) gehört allem anderen. Keine Tintenwahl pro Notiz.

**The Gold Rule.** Gold taucht selten auf. Wenn es häufig erscheint, verliert es seine Bedeutung. Nie für CTAs oder Alltags-UI.

**The Papier-Kontrast Rule.** Jeder Text hat mindestens 4,5:1, auch auf `paper-deep` (den dunkleren Papierrändern).

Pro Ort gibt es eine Akzentfarbe aus der Landschaft (`--color-world-*`, `data-world`); sie lebt nur in Welt- und Garten-Illustration, nie im Journal-Rahmen.

## Typography

**Display Font:** Fraunces (400, 600) – Überschriften, Fließtext, Buttons, alle großen Zahlen (XP, Coins, Level, auch der Timer), Ortsnamen.
**Label Font:** Courier Prime (400) – nur kleine Etiketten und Metadaten, mindestens 13 px (Preise auf Steckschildern, Daten, Stempeltexte).
**Hand Font:** Caveat (500) – nur Robins Stimme, höchstens eine Notiz pro Screen.

**Character:** Eine Serifenschrift mit Wärme für alles Gelesene, eine Schreibmaschine für alles Beschriftete, eine Füllerhand für Robin. Drei Schriften, drei Aufgaben, keine Überlappung.

### Hierarchy
- **Display** (600, 2rem, 1.2): Seiten- und Panel-Überschriften.
- **Body** (400, 1,0625rem ≥ 16 px, 1.5): Fließtext, Buttons (600), Eingaben.
- **Numbers** (600, 3rem, tabular-nums): XP, Coins, Timer; immer Fraunces, nie Courier. XP/Level/Streak noch größer als app-üblich.
- **Label** (400, 0,875rem, 1.3, normale Schreibung, ohne Sperrung): Etiketten, Feldbeschriftungen, Stempeltexte.
- **Hand** (500, ab 1,375rem, Standard 1,5rem): Robins Notiz, Zeilenbreite 13em (ca. 32 Zeichen), 1–2 kurze Sätze.

**The Hand-Nur-Robin Rule.** Handschrift nie für Bedienelemente (Buttons, Navigation, Formularfelder), Preise oder wichtige Zahlen.

**The Keine-Sperrung Rule.** Keine Großbuchstaben-Labels mit Buchstabenabstand. Betonung durch Etikett, Gewicht oder Unterstreichung.

**The Tabular Rule.** Zahlen, die sich ändern (Timer, XP, Coins), stehen mit `tabular-nums`, damit nichts ruckelt.

## Layout

Desktop zuerst, Smartphone danach. Der Studyroom ist zweigeteilt: oben der lebendige Garten (möglichst wenig verdeckt), unten Journalzettel (Timer, To-do, Sounds). Garden und Nursery sind organisch komponiert, nicht rasterstreng: Objekte überlappen und variieren in der Größe. Das Journal ist eine Doppelseite. Navigation sind Lesezeichen-Bänder am Journal-Rahmen, keine Pills und keine weiße Top-Leiste.

Abstände: ein Raster aus 4, 8, 12, 20, 28, 40, 56 und 80 px (`--space-1` bis `--space-8`). Großzügig zwischen Panels (Platz für Klebeband und gekippte Ecken, 56 px), enger im Panel. Zeilen mit Bedienelementen sind mindestens 44 px hoch. Größen sind in rem, damit Schriftgröße-Einstellungen gelten. Bei 375 px läuft nichts seitlich über (Klebeband steht höchstens 12 px über).

**The Papier-Rand Rule.** Ein `PaperPanel` hält 18 px für seinen gerissenen Rand frei; Inhalt, Stempel und Klebeband planen damit, nicht dagegen.

## Elevation & Depth

Tiefe entsteht durch Material: Papierkante, Klebeband, kleine Drehung und ein warmer, eng anliegender Schatten, der der Kante folgt. Nie durch weiche, graue Kartenschatten.

- **Papier** (`--filter-paper`): drei `drop-shadow`-Ebenen in warmem Braun (rgba 92,64,32 / 60,40,20); liegt auf einem `::before` hinter dem Inhalt, nie als `filter` auf dem Panel selbst. Für gerade Kanten gibt es `--shadow-paper` als `box-shadow`.
- **Einzelne Gegenstände** (`--filter-label`, `--filter-wood`, `--filter-wood-lift`, `--filter-wood-press`, `--filter-wood-faint`, `--filter-pebble`): kleine, enge `drop-shadow`s derselben Braunfamilie. Holz hebt sich beim Hover (`lift`) und sinkt beim Drücken (`press`).

**The Kein-Box-Shadow Rule.** Papier mit gerissenem Rand bekommt nie einen `box-shadow` (er säße am Rechteck statt am Rand). Keine Blur- oder Glas-Panels, auch nicht „nur ein bisschen“.

## Shapes

Gegenstände sind kantig-organisch, nicht rund: Buttons haben höchstens 4 px Radius, nie eine Pillenform und nie einen Etikett-Rahmen. Papier hat gerissene Ränder, Etiketten einen Doppelrahmen, Stempel Ringe oder Rahmen. Alle Tintenformen (Kästchen, Ellipsen, Linien, Rahmen) sind handgezeichnet mit leichtem Wackler.

**Strichstärken** (nur diese drei, Tokens in `:root`): `--ink-fine` 1 px (Hilfslinien, auf denen man schreibt oder schiebt), `--ink-line` 1,5 px (Rahmen und Umrisse), `--ink-stroke` 2,25 px (Haken, Slider-Füllung, Robins Pfeile, Fokusrahmen). Gezeichnete SVG-Striche immer mit `non-scaling-stroke`.

**Drehung:** klein halten, damit es lebendig wirkt und nicht chaotisch: ±1–3°, breite Panels höchstens 1°, Stempel bis ±15° (Standard +4°). Höchstens **ein** gekipptes Element pro Panel zusätzlich zum Panel selbst, die Richtung gegen die des Panels; Klebeband zählt nicht.

**The Gezeichnet-nicht-Gerade Rule.** Eine Tintenlinie ist nie ein gerader CSS-`border`. Dafür gibt es `InkRule` und `InkFrame`. Ausnahme sind nur gedruckte Linien im Linienpapier und am Stempel.

## Components

Alle Bausteine stehen in `components/journal/`, sind auf `/dev/components` zu sehen und sind die einzigen Bauteile für Seiten. Props und „Wofür / Wofür nicht“ stehen in `docs/ROBIN.md` §13.

### Papier (`PaperPanel`)
- **Charakter:** Ein Blatt Journalpapier aus `paper-note.webp` als 9-Slice, optional liniert oder kariert, optional mit Klebeband oben oder an den Ecken. Ersetzt jede weiße Karte.
- **Verhalten:** Dehnt sich, ohne den gerissenen Rand zu verzerren; schmale Drehung per `tilt` (breit ≤ 1°).

### Etikett (`Label`)
- **Charakter:** Ein Schreibmaschinen-Etikett mit Doppelrahmen, Courier Prime in normaler Schreibung, so breit wie sein Inhalt. Titel gedämpft, Wert in voller Tinte. Ersetzt Chips und Großbuchstaben-Labels.

### Buttons (`Button`)
- **Charakter:** Buttons sind Gegenstände, Etiketten sind Papier. **Primary** ist ein Holzschild in Material des Ortes (Nägel an den Enden fix, die Mitte als Kachel), Schrift eingebrannt in `wood-ink`. **Secondary** ist ein handgezeichneter Tintenrahmen ohne Füllung, **Quiet** unterstrichener Text; beide nur auf Papier.
- **Zustände:** Hover hebt das Holz leicht, Active drückt es ein (nur ohne reduced motion); Disabled ist verblasstes Holz bzw. gestrichelter Rahmen; Loading zeigt drei Tintenpunkte über dem unsichtbaren Label, die Breite bleibt. Fokus: gemeinsamer Fokusrahmen.

### Eingabefelder (`TextInput`, `Checkbox`, `Slider`, `ChoiceGroup`)
- **Charakter:** Stehen immer auf Papier, sind echte `input`-Elemente mit `label` und per Tastatur bedienbar. `TextInput`: keine Box, nur eine Schreibzeile, Label in Courier darüber. `Checkbox`: gezeichnetes Kästchen, der Haken malt sich in ca. 250 ms (erledigter Text dünn in Tinte durchgestrichen, nicht grau). `Slider`: Tintenlinie, kräftigere Füllung, Kieselstein-Griff (Tintenklecks als Option). `ChoiceGroup`: Optionen als Fraunces-Text, die gewählte mit Tinten-Ellipse umkreist, keine Pills.
- **Zustände:** Deaktiviert = gestrichelte Bleistiftlinie in `ink-muted`. Fehler = Linie und Hinweis in `error-deep`.

### Fokus (`FocusFrame`)
- **Eine Fokus-Sprache für alle Bedienelemente:** ein handgezeichneter Rahmen in `--ink-stroke` über einem Papier-Halo (damit er auch auf dem Garten sichtbar ist), bei `:focus-visible`, ohne Übergang, nie der Browser-Ring. Im Hochkontrastmodus stattdessen eine `outline` in `CanvasText`.

### Robins Stimme (`RobinNote`)
- **Charakter:** Eine handschriftliche Notiz in Füllertinten-Blau, Caveat, signiert „— R.“ mit zwei Vogelfußabdrücken, optional mit handgezeichnetem Pfeil. Auf Papier als Text, über dem Garten immer als eigener Zettel (Slip) mit honigfarbenem Klebeband. Mini-Robin als Bild nur bei besonderen Momenten (Onboarding, erste Blüte, Level-up).

### Stempel (`Stamp`)
- **Charakter:** Gedruckt, nicht gezeichnet: rund (Poststempel mit Doppelring), eckig oder doppelt gerahmt, in Grün, Rost oder Blau, mit einfarbigem Pflanzenabdruck. Druck-Optik (Deckkraft 0,85 plus ein gemeinsamer Filter) nur auf Rahmen, Ringen und Mitte; kleiner Text bleibt voll deckend. Steht immer auf Papier, nie auf dem Garten und nie auf den dunklen Papierrändern.
- **Bewegung:** `animate` drückt ihn kurz auf und lässt ihn wackeln, nur ohne reduced motion.

### XP (`XpSeedRow`, `XpSeedJar`)
- **Charakter:** Eine Tintenfurche mit zehn Pflanzgruben; jedes volle Zehntel des Levels ist ein Samen, das angefangene Zehntel ein halb vergrabener Samen in Vierteln. Ein neuer Samen fällt mit kleinem Bounce ins Loch. Das Samenglas gibt es nur auf der Journal-Seite, nie in der Kopfzeile. Beide stehen direkt auf Papier und lassen den Level-up-Moment aus.

### Icons (`GameIcon`)
- **Charakter:** Eigene Aquarell-Icons im Asset-Stil, keine Lucide. Spiel-Icons (Coin, XP-Samen, Streak, Freezer) ab 16 px, Navigations-Icons (Studyroom, Garden, Nursery, Journal, Herbarium, Settings) ab 24 px. Fehlende Icons sind gestrichelte Platzhalter.

## Do's and Don'ts

### Do:
- **Do** fragen: Zu welcher Ebene gehört der Baustein (Reise, Journal, Ort)? Daraus folgt das Material.
- **Do** nur bestehende Bausteine verwenden; neue Varianten nur, wenn kein Baustein passt.
- **Do** Tinte immer zeichnen (`InkRule`, `InkFrame`), mit `--ink-fine`, `--ink-line` oder `--ink-stroke`.
- **Do** alle Bewegung in `@media (prefers-reduced-motion: no-preference)` legen; ohne diese Angabe sieht man sofort den Endzustand.
- **Do** Belohnungen als einen orchestrierten Moment bauen (Robin erscheint → +XP zählt hoch → Coins fliegen → Streak pulsiert), Lernen und Formulare ruhig lassen.
- **Do** alle UI-Texte auf Englisch schreiben, Screen-Namen exakt: Studyroom, Garden, Nursery, Journal, Herbarium, Settings. Leerzustände spricht Robin („— R.“), Bedienelemente sprechen neutral („Start session“, „Save“).

### Don't:
- **Don't** Großbuchstaben-Labels mit Sperrung, weiße Karten mit Schatten, Pills als Navigation, Glassmorphism, verschwommene Farbkleckse, Lucide-Icons oder ein generisches Produkt-Grid im Shop verwenden.
- **Don't** Handschrift (Caveat) für Buttons, Navigation, Formularfelder, Preise oder wichtige Zahlen einsetzen; höchstens eine Robin-Notiz pro Screen.
- **Don't** Courier Prime unter 13 px oder für große Zahlen verwenden.
- **Don't** Text direkt auf Illustration setzen; Stempel und Handschrift stehen nie direkt auf dem Garten.
- **Don't** `error` (#E4685D) für Text verwenden (2,87:1), `ink-soft` auf Papier (4,04:1) oder weißen Text auf `primary` (3,04:1).
- **Don't** mehr als ein gekipptes Element pro Panel oder gleich gerichtete Drehungen stapeln.
- **Don't** das Level lokal berechnen oder cachen; immer die Serverantwort übernehmen. Level-up gehört in einen eigenen Moment, nicht in die XP-Bausteine.
- **Don't** kindisch werden (Konfetti- und Sternen-Overload), generisches Flat-Design bauen („Duolingo ohne Seele“), fotorealistisch werden oder wie ein SaaS-Dashboard mit grünem Akzent aussehen.
