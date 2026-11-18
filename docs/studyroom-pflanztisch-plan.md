# Studyroom als Pflanztisch – Plan

Folgt auf `docs/studyroom-plan.md` (Zettel mit Klebeband, umgesetzt). Neue Richtung: der Studyroom
ist Robins **Pflanztisch im Garten**. Ebene **Ort**, Material der Garten-Welt: Holz, Schiefer/Kreide,
Jute/Schnur, Terrakotta, Packpapier. Papier und Tinte nur, wo jemand schreibt (Notizen, To-do).

## Entschieden (2026-11-18)

1. **Bedienelemente auf Schiefer und Holz:** `ChoiceGroup`, `TextInput`, `Slider` bekommen
   `surface="slate"` (Kreide) und `surface="wood"` (Brandschrift, Schnur-Slider). Der Fokusrahmen
   bleibt derselbe.
2. **Fortschrittsschiene = Vorderkante des Pflanztischs:** Holzleiste, füllt sich mit einem
   Kreidestrich, in der Pause gestrichelt. `role="progressbar"` bleibt. **Lage (entschieden
   2026-11-18): an der Kante zum Garten, oben am Tisch.**
3. **Pause-Notiz** als kleiner Zettel, mit einem Nagel an den Tafelrahmen geheftet.
4. **Reward und Complete** (umgesetzt später am 2026-11-18): Reward als Zettel, auf die Tafel
   genagelt (im Vollbild geklebt über dem Garten); Complete in Kreide auf der Tafel, Robins Notiz
   mit Bild an den Rahmen genagelt.
5. **700–1100 px zweispaltig:** Tafel oben über die volle Breite, To-do und Ambience nebeneinander.
6. **Keine Packpapier-Anhänger als Titel.** Timer ohne Titel; der To-do-Titel steht oben auf dem
   Zettel; „Ambience“ ist in die Vorderseite der Kiste eingebrannt (`wood-ink`).
7. **Vollbild-Knopf** als kleines Holzplättchen mit Icon.
8. **`HangTag`** erst bauen, wenn wir ihn wirklich brauchen.
9. **Layout „window“** (2026-11-18, gegen „bleed“): Der Garten wird durch ein Holzfenster gesehen.
   Rahmen oben, links und rechts im Holz der Tafel, keine runden Ecken, kein heller Rand. Das untere
   Fensterbrett ist der Pflanztisch, nur so hoch wie seine Gegenstände, die Gegenstände nah am
   Garten. Die Fortschrittsschiene liegt auf der Kante zwischen Fensterbrett und Garten (nur
   während einer Session; im Leerlauf nur eine schmale Lippe aus Rahmenholz). Im Vollbild ohne
   Rahmen.

## Befunde

- **„Mountains · Lv 20“ abgeschnitten:** Die Place-Zeile war bei 1440 px 420 px breit, die Box
  412 px; die Optionen brachen nicht um, und der scrollende Zettelkörper schnitt die Ellipse ab.
- **Slider-Startwerte:** alle 0 (stumm), wie in der alten Version; richtig, solange es kein Audio
  gibt. Gespeichert wird nichts; `study_room_settings.sound_volumes` (jsonb, Standard `{}`)
  bleibt ungenutzt, bis Audio kommt.

## Aufbau

**Desktop (ab 1100 px, kein Seitenscroll):** oben der Garten im Holzfenster (Rahmen oben, links,
rechts), frei bis auf den Vollbild-Knopf. Darunter das Fensterbrett als Pflanztisch über die
volle Breite, nur so hoch wie seine Gegenstände; darauf genau drei Gegenstände in dieser
Reihenfolge mit gleicher Unterkante: Schiefertafel (Timer), Papierzettel mit Nagel (To-do),
flache Holzkiste (Ambience). Keine weitere Deko.

```
╔════════════════════════════════════════════════════╗  ← Fensterrahmen (9-Slice)
║                                               [▣]  ║  ← Holzplättchen (Vollbild)
║                    Garten (frei)                   ║
╟──── Fortschrittsschiene (nur während Session) ─────╢
│░░░░░░░░░░ Fensterbrett = Pflanztisch ░░░░░░░░░░░░░░│
│ ┌═══════════┐      •           ┌────────────────┐  │
│ ║ 24:59     ║  ┌──────────┐    │ Rain ──●  …    │  │
│ ║ Next up   ║  │ To-do    │    │ Place: …       │  │
│ ║ Modus     ║  │ ☐ …      │    ├────────────────┤  │
│ ║ [Start]   ║  │ New __   │    │   AMBIENCE     │  │ ← eingebrannt
│ └═══════════┘  └──────────┘    └────────────────┘  │
│▔▔▔▔▔▔▔▔▔▔▔▔▔▔ gleiche Unterkante ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│
└────────────────────────────────────────────────────┘
```

**Mobil (< 1100 px, bis 320 px ohne Seitenscroll):** Garten im Fenster (schmalerer Rahmen) ca. 44–52 dvh, darunter das Fensterbrett
durchgehend; Tafel über die volle Breite (Start ohne Scrollen erreichbar), darunter To-do und
Ambience – 700–1100 px nebeneinander, darunter untereinander.

## Assets (später generieren; bis dahin CSS-Platzhalter)

WebP in `public/ui/`, Originale in `design-src/ui/`.

| Asset | Form | Hinweise |
|---|---|---|
| Fensterrahmen | 9-Slice, siehe unten | Holz wie Tafelrahmen; nur oben, links, rechts |
| Fensterbrett (Tisch) | 3 Teile, siehe unten | helles Holz, wenig Maserung, Bretter quer |
| Schieferrahmen | 9-Slice, Rahmen ca. 28 px | Holzrahmen, Ecken fix, innen transparent |
| Schiefer-Innenfläche | nahtlose Kachel, ca. 512² | dunkel grau-grün, leichte Kreidewischer, ruhig |
| Nagel | Sprite, ca. 32 px | schräger Schmiedenagel mit kleinem Schatten |
| Holzkiste | 9-Slice, Vorderkante ca. 24 px | flach, leicht von oben, Boden etwas dunkler |
| Holzplättchen | 3-Slice oder fest, ca. 44 px | kleines Brettchen für den Vollbild-Knopf |

### Fenster und Fensterbrett zerlegen

Der Code ist für die Assets vorbereitet; eingesetzt werden sie über Variablen auf `.page` in
`components/studyroom/studyroom.module.css`, ohne Umbau.

**Fensterrahmen** – ein Bild, als 9-Slice auf den Rand der Bühne (`border-image`):

```
┌────┬──────────────────────┬────┐
│ TL │   oben (wiederholt)  │ TR │   Ecken fix
├────┼──────────────────────┼────┤
│ L  │                      │ R  │   Seiten wiederholt (round)
│    │   transparent/leer   │    │   Mitte bleibt leer: dort ist der Garten
├────┴──────────────────────┴────┤
│        (keine Unterkante)      │   unten liegt das Fensterbrett
└────────────────────────────────┘
```

- Bild z. B. 512 × 512 px, Rahmenbreite im Bild einheitlich (z. B. 56 px); innen transparent,
  unten kein Rahmenstück nötig (die untere Slice ist 0).
- Oben und an den Seiten muss das Holz nahtlos wiederholbar sein (Maserung längs der Leiste).
- Ecken: Gehrung oder Überblattung, mit dem Licht von oben links wie bei Tafel und Holzschild.
- Einsetzen: `--window-frame-image: url("/ui/window-frame.webp");`,
  `--window-frame-slice: 56 56 0;` (Bildpixel), Breite auf dem Bildschirm `--window-frame`
  (Desktop 0,875rem, mobil 0,5rem).

**Fensterbrett (Pflanztisch)** – drei Bilder, gleiche Höhe:

```
┌──────┬────────────────────────────────┬──────┐
│ links│  Mitte (nahtlos, repeat-x)      │rechts│
│ fix  │                                │ fix  │
└──────┴────────────────────────────────┴──────┘
```

- `sill-left.webp` und `sill-right.webp`: die Enden mit Hirnholz/Kante, fix, Breite
  `--sill-cap` (2rem). `sill-middle.webp`: nahtlose Kachel, wird in der Breite wiederholt und
  auf die Tischhöhe gestreckt (`background-size: auto 100%`); deshalb Maserung quer und ohne
  markante Äste, die beim Strecken auffallen.
- Höhe im Bild ca. 320 px (der Tisch ist auf dem Desktop ca. 260–300 px hoch, mobil höher; die
  Mitte darf sich in der Höhe etwas strecken).
- Oben eine schmale, etwas dunklere Kante (die Lippe zum Garten, heute `--sill-lip` in
  Rahmenholz) kann ins Bild; dann `--sill-lip: 0`.
- Einsetzen: `--sill-left-image`, `--sill-middle-image`, `--sill-right-image` als `url(...)`.
- Die Fortschrittsschiene bleibt ein eigenes Teil (Leiste im Rahmenholz, `session-rail`), weil
  sie Text und Kreide trägt.

## Schritte (jeder ein Commit, nicht pushen)

1. **Skill:** Material-Set pro Welt (Garten; Strand und Berge als Ausblick), Papier/Tinte auf der
   Ort-Ebene nur zum Schreiben, Eingabefelder auf Papier, Schiefer oder Holz, Studyroom-Abschnitt.
2. **Kleine Fehler:** Place bricht um statt abgeschnitten zu werden; Slider-Startwerte als
   Kommentar festhalten.
3. **Werkbank-Skelett:** Holzfläche, drei Gegenstände mit gleicher Unterkante; `Slip` und die
   `Label`-Titel fallen weg; Timer ohne Titel, To-do-Titel oben auf dem Zettel, Kiste mit
   eingebranntem „Ambience“. Material noch CSS-Platzhalter, Inhalte unverändert.
4. **Schiefertafel-Timer:** Holzrahmen, Zeit in Fraunces als `TabularNumber` in Kreide, Modus und
   Rounds als `surface="slate"`, Start bleibt Holzschild; Kontrast messen (≥ 4,5:1).
5. **Nägel:** To-do-Zettel genagelt; Pause-Notiz als genagelter Zettel am Tafelrahmen.
6. **Ambience-Kiste:** `Slider` und `ChoiceGroup` mit `surface="wood"` (Schnur, Brandschrift).
7. **Vollbild und Schiene:** Holzplättchen-Knopf, Fullscreen-Uhr, Fortschrittsschiene als Holzleiste.
8. **Abschluss:** `/dev/components`, `docs/ROBIN.md`, Migration-Inventory, Konzept; Screenshots
   1440 / 768 / 375 / 320 px, idle / läuft / Pause / Complete, Tastatur, Fokus, reduced motion.
