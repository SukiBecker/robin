# Studyroom im Schuppen – Plan

Stand 2026-11-22. Ersetzt den Pflanztisch (`docs/studyroom-pflanztisch-plan.md`) und die
Dev-Variante `?layout=bar`. Idee: **derselbe Schuppen wie die Nursery, andere Wand.** Robin
und du sitzt drinnen, durchs Fenster sieht man den Garten wachsen.

---

## 1. Was die Nursery schon hat (Bestand)

| Teil | Datei | Wiederverwendbar? |
|---|---|---|
| Schuppenwand | `components/place/place-backdrop.tsx` (`world="garden"`, `shed-wall.webp`, `room-backdrop`-Finish) | **direkt** – war von Anfang an auch für den Studyroom gedacht |
| Regalbrett | `components/nursery/shelf.tsx` + `shelf.module.css` (3-Slice `shelf-plank-left/middle/right.webp`, `--plank-h`) | **nur das Brett**: `Shelf` ist eine Item-Liste mit Spaltenmessung; das Brett selbst muss als eigener Baustein heraus |
| Robin | `components/nursery/robin-perch.tsx` (`neutral/happy/sad`, gestapelt, nur `opacity`, Hüpfer bei `happy`) | **direkt**, nur Position und Höhe (`--perch-h`) setzt der Studyroom |
| Detail-Notiz | `components/nursery/item-note.tsx` (`<dialog>` + `showModal()`, Klick außen, Fokus zurück, warme Abdunklung, Zettel von unten unter 600 px) | **die Dialog-Hülle**, für das Ambience-Panel; Inhalt bleibt Nursery-spezifisch |
| Ranke | – | **gibt es nicht.** In der Nursery (und im ganzen Repo) existiert keine Ranke. Sie muss neu gebaut werden (siehe 3). |

Aus dem jetzigen Studyroom bleibt:

| Teil | Datei | Was passiert |
|---|---|---|
| Fensterrahmen | `public/ui/window-frame.webp` (1126 × 508, oben + Seiten, unten offen) | bleibt, wird größer |
| Fensterbank | `sill-back / sill-surface / sill-front-*.webp` | wird das Fensterbrett, auf dem Robin sitzt |
| Garten live | `GardenScene` + `useGardenObjects`, `HOME_REGION` | bleibt im Fenster |
| Timer-Logik | `app/studyroom/page.tsx` (Phasen, Rounds, Supabase, Reward) | **unverändert**, nur das Markup darunter wechselt |
| Schiefertafel | `timer-board.tsx` | wird schlanker: Zeit + Modus; Rounds bleiben auf der Tafel |
| Holzschild | `Button variant="primary"` | eigenes Objekt auf dem Brett statt auf der Tafel |
| To-do | `todo-note.tsx` + `nail.tsx` | Zettel an der Wand statt auf dem Tisch |
| Ambience | `ambience-crate.tsx` | Regler wandern in ein Panel; auf dem Brett nur die kleine Kiste |
| Session-Ende | `session-complete.tsx`, `reward-slip.tsx` | bleiben, neuer Ort (siehe 4) |
| Fullscreen | Knopf + `requestFullscreen` auf der Bühne | bleibt, zeigt Fenster + Ranke + Uhr |

---

## 2. Skizzen

### Desktop (≥ 64rem)

```
 ┌─ Kopfzeile (Papier, Bänder) ──────────────────────────────────────────────┐
 │░░ Schuppenwand ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
 │░░ ╔═══════════════════════════════════════════════════════╗ ░░░░░░░░░░░░░│
 │░░ ║~~~~~~~~~~ Ranke wächst oben entlang ~~~~~~~~~~~~~~~~~~║ ░ ┌─────────┐ │
 │░░ ║                                                  [⛶] ║ ░ │ To-do  📌│ │
 │░░ ║§                                                      ║ ░ │ ☐ ...   │ │
 │░░ ║§           G A R T E N   (live, so groß wie möglich)  ║ ░ │ ☐ ...   │ │
 │░░ ║§                                                      ║ ░ │ + Add   │ │
 │░░ ║§ ← Ranke startet unten links, klettert hoch           ║ ░ └─────────┘ │
 │░░ ║§                                                      ║ ░░░░░░░░░░░░░│
 │░░ ╚═══════════════════════════════════════════════ 🐦 ═══╝ ░░░░░░░░░░░░░│
 │░░ ▀▀▀▀▀▀▀▀▀▀▀▀▀ Fensterbrett (Robin rechts) ▀▀▀▀▀▀▀▀▀▀▀▀▀▀ ░░░░░░░░░░░░░│
 │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
 │░░░░░░░  ┌────────────────┐   ╭───────────────╮   ┌──────┐  ░░░░░░░░░░░░░░░░│
 │░░░░░░░  │  25:00         │   │ Start session │   │Ambi- │  ░░░░░░░░░░░░░░░░│
 │░░░░░░░  │  25/5 · 50/10  │   ╰───────────────╯   │ence  │  ░░░░░░░░░░░░░░░░│
 │░░░░░░░  │  Rounds 1      │                       └──────┘  ░░░░░░░░░░░░░░░░│
 │░░░░░░░ ▄█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█▄ ░░░░░░░░░░░░░░░│
 │░░░░░░░  ┘ Halter                                   Halter └ ░░░░░░░░░░░░░░│
 └───────────────────────────────────────────────────────────────────────────┘
```

- Fenster ≈ 75 % der Breite, links; Höhe = Viewport − Kopfzeile − Brettzone (≈ 12rem). Der
  Garten füllt das Fensterloch komplett.
- To-do rechts neben dem Fenster, oben bündig mit der Fensteroberkante, genagelt (`Nail`),
  ±1,5°.
- Regalbrett mittig unter dem Fenster, nicht über die volle Breite (zwei echte Enden mit
  Haltern, wie in der Nursery). Darauf genau drei Dinge, gleiche Unterkante: Tafel · Schild ·
  Kiste.
- Robin sitzt rechts auf dem Fensterbrett, Füße auf der Brettkante, überdeckt den Garten nur
  am Rand.

### Tablet (40–64rem)

Wie Desktop, aber To-do **unter** dem Brett rechts, Fenster über die volle Breite.

### Mobil (bis 40rem, geprüft ab 320 px)

```
 ┌─ Kopfzeile 2-zeilig ────────────┐
 │░╔═════════════════════════════╗░│
 │░║~~~~~~~~ Ranke ~~~~~~~~~~ [⛶]║░│
 │░║§                            ║░│
 │░║§       G A R T E N          ║░│   Fenster: volle Breite − 16 px Rand,
 │░║§       (≈ 48dvh)            ║░│   ≈ 48dvh, min. 280 px
 │░║§                         🐦 ║░│
 │░╚═════════════════════════════╝░│
 │░▀▀▀▀▀▀▀▀ Fensterbrett ▀▀▀▀▀▀▀▀▀░│
 │░┌──────────────┐   ┌───┐░░░░░░░░│
 │░│ 25:00        │   │Amb│░░░░░░░░│   Tafel + Kiste auf dem Brett,
 │░│ 25/5 · 50/10 │   └───┘░░░░░░░░│   Schild steht vorn an der Tafel
 │░│ ╭───────────╮│░░░░░░░░░░░░░░░░│   (überlappt ihren unteren Rahmen)
 │░▄█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█▄░│
 │░  ╰ Start session ╯ ░░░░░░░░░░░░│
 │░░┌──────────────────────────┐░░░│
 │░░│ To-do 📌                 │░░░│   To-do unter dem Brett, volle Breite
 │░░│ ☐ ...                    │░░░│
 │░░└──────────────────────────┘░░░│
 └─────────────────────────────────┘
```

- Bei 320 px passen Tafel (≈ 10rem), Schild (≈ 7rem) und Kiste (≈ 3rem) nicht nebeneinander auf
  288 px. Deshalb steht das Schild unter 40rem vorn an der Tafel. **Bei 320 px prüfen**, sonst
  Schild auf ein zweites, kurzes Brett.
- Kein seitliches Scrollen. Fenster, Robin und Ranke werden mit `--wood-scale` kleiner.

---

## 3. Was neu gebraucht wird

### 3.1 `VineProgress` (neu, `components/studyroom/vine-progress.tsx`)

Die Ranke am Fensterrahmen ersetzt `SessionRail`.

- **Weg:** startet unten links am Rahmen, klettert den linken Pfosten hoch, läuft über den
  oberen Balken nach rechts (≈ 1 Rahmenlänge links + 1 oben). Der rechte Pfosten bleibt frei
  (dort sitzt Robin, und das Fenster wirkt nicht zugewachsen). Ein SVG über dem Rahmen
  (`preserveAspectRatio="none"` geht nicht, weil Blätter sonst verzerren) → **Pfad in
  Pixeln, per ResizeObserver aus der Fenstergröße berechnet**, Blätter als eigene Elemente an
  Punkten des Pfads (`getPointAtLength`).
- **Wachsen:** Stiel = Strich mit `pathLength="1"`, `stroke-dashoffset: 1 − progress`
  (dieselbe Ausnahme wie der Checkbox-Haken: ein Strich lässt sich nur so malen). Alle 10 %
  ein Blattpaar, das per `opacity` + `scale` aufgeht. In der Pause steht die Ranke still
  (Fortschritt hält schon heute in der Pause an).
- **Complete:** an 5–7 Knoten gehen Blüten auf, gestaffelt (`staggerChildren`), Overshoot
  `[0.34, 1.56, 0.64, 1]`. Danach bleiben sie, bis eine neue Session startet; dann welkt
  nichts zurück, sondern die Ranke wird ohne Animation zurückgesetzt.
- **Ohne Session:** nur ein kleiner Trieb unten links (ein Blattpaar), damit klar ist, wo es
  wächst.
- **Barrierefreiheit:** Wrapper `role="progressbar"`, `aria-label="Study progress"`,
  `aria-valuenow` in %, `aria-valuetext` „42 %, break“. Phase (Focus/Break/Paused) und Prozent
  stehen **nicht auf der Wand** (kein Text auf Illustration), sondern klein auf der
  Schiefertafel.
- **Reduced motion:** keine Übergänge; Stiel, Blätter und Blüten springen auf den aktuellen
  Stand (statische Füllung).
- **Material:** gezeichnete Ranke im Asset-Stil, erst als Platzhalter (Stiel `#5f7f43`,
  Blätter wie `SeedlingPot`).
- **Endgültige Ranke (entschieden 2026-11-22, nach dem Mock):** eine **gemalte Ranke
  `vine.png`** (Original in `design-src/ui/`, WebP in `public/ui/`), kein gezeichneter
  SVG-Strich. Sie **wächst per Maske entlang des Pfads**: über dem fertig gemalten Bild liegt
  eine Maske (SVG-`mask` mit dem Pfad als breitem Strich, `stroke-dashoffset` = 1 − progress),
  die das Bild vom Start unten links den Pfosten hoch und dann den oberen Balken entlang
  freilegt. Das Bild selbst bewegt sich nicht. Weg links hoch + oben entlang (Frage 2 in §6
  damit entschieden), der rechte Pfosten bleibt frei.
- **Blüten bei Complete einzeln:** eigene gemalte Blüten (`vine-bloom.webp`) an festen
  Knoten der Ranke, die bei Session-Ende **nacheinander** aufgehen (`opacity` + `scale`,
  gestaffelt, Overshoot), nicht als ein Bild auf einmal. Reduced motion: alle sofort da.
- Fullscreen: Rahmen und Ranke bleiben sichtbar (der Rahmen ist dünn), die Uhr wie heute.

### 3.2 `ShelfPlank` (aus `shelf.tsx` herausgelöst)

Das Brett als eigener Baustein (`components/place/shelf-plank.tsx`, gehört zur Ort-Ebene):
3-Slice, `--plank-h`, Halter. `Shelf` in der Nursery nutzt ihn danach selbst – keine
sichtbare Änderung dort.

### 3.3 `NoteDialog` (aus `item-note.tsx` herausgelöst)

Die Dialog-Hülle (`showModal`, Klick außen, Fokus zurück, Abdunklung, Ein-/Ausblenden,
mobil von unten) als Baustein; `ItemNote` und das Ambience-Panel nutzen ihn.

### 3.4 Ambience-Kiste

- Auf dem Brett: kleine Holzkiste (≈ 4rem), „Ambience“ eingebrannt (`wood-ink`), Button mit
  `aria-haspopup="dialog"`, `FocusFrame`.
- Panel: `NoteDialog`, aber nicht auf Papier – die Regler gehören zur Ort-Ebene. Das Panel ist der aufgeklappte Kistendeckel / ein Holzbrett mit `surface="wood"`-Slidern und
  Place-Auswahl (Inhalt wie heute in `ambience-crate.tsx`). Läuft Ambience, zeigt die Kiste
  einen kleinen Zustand (Deckel einen Spalt offen), damit man es ohne Öffnen sieht.
- Asset: Kiste zunächst aus vorhandenem Holz (`button-wood`-Kachel), gemalte `crate.webp`
  später.

### 3.5 Fenster + Fensterbrett

Neuer Wrapper `StudyWindow` (im Studyroom-Ordner): Rahmen (`window-frame.webp` als
Border-Image wie heute) + Fensterbrett unten (die `sill-*`-Assets) + Garten im Loch +
Fullscreen-Knopf + Slot für Ranke und Robin.

### 3.6 Robin

`RobinPerch` auf dem Fensterbrett, rechts, `--perch-h` 4,5rem (mobil 3,75rem):

| Zustand | Stimmung |
|---|---|
| idle, focus, break, paused | `neutral` (ruhig, kein Hüpfen) |
| complete | `happy` + ein Hüpfer, solange der Complete-Zustand gilt |
| Session-Fehler (`sessionError`) | `sad`, solange er angezeigt wird (optional) |

Robins Pause-Notiz bleibt ein kleiner Zettel, an den Tafelrahmen genagelt.

---

## 4. Session-Ende als ein Moment

Reihenfolge (nur ohne reduced motion gestaffelt, sonst alles sofort):

1. Ranke erreicht 100 %, Blüten gehen auf (≈ 600 ms).
2. Robin wird `happy`, hüpft.
3. `SessionComplete` / `RewardSlip` erscheinen als Zettel, an die Tafel genagelt
   (+XP und Coins zählen hoch, Kopfzeile zieht nach).

---

## 5. Einzelschritte

0. **Vorher:** die offenen Änderungen (`room-backdrop.css`, `room-transition.ts`,
   `place-backdrop`, Nav, Journal-Desk) committen, damit der Umbau auf sauberem Stand
   beginnt.
1. `ShelfPlank` und `NoteDialog` herauslösen; Nursery nutzt sie. Nursery bei 1280 und 320 px
   gegenprüfen (keine sichtbare Änderung).
2. Studyroom-Gerüst: `PlaceBackdrop world="garden"` als Seite, `StudyWindow` mit Garten,
   Fensterbrett und Fullscreen-Knopf. Garten-Größe auf Desktop und mobil einstellen.
3. Brett unter dem Fenster mit Tafel (Zeit, Modus, Rounds, Phase/Prozent klein) und
   Holzschild „Start session“ (während der Session: Pause/End wie heute auf der Tafel).
4. To-do an die Wand (Desktop rechts neben dem Fenster, sonst unter dem Brett).
5. Ambience-Kiste + Panel.
6. `RobinPerch` aufs Fensterbrett, Stimmung aus der Phase.
7. `VineProgress` (Platzhalter-SVG) mit progressbar-Semantik und reduced motion; ersetzt
   `SessionRail` auch im Fullscreen.
8. Session-Ende orchestrieren (4).
9. **Aufräumen:** Pflanztisch (Bench-CSS, `SeedlingPot`, `SessionRail` + CSS), `StudyBar`,
   `study-bar.module.css`, `?layout=bar` samt `data-layout`-Regeln in
   `studyroom.module.css` entfernen. Ungenutzte Assets (`rail-wood.webp`) löschen.
10. Doku: robin-design §3 Studyroom und §4 neu schreiben, `docs/ROBIN.md` anpassen,
    `studyroom-pflanztisch-plan.md` als ersetzt markieren.
11. Prüfen: 1280 / 768 / 375 / 320 px, Tastatur (Tab-Reihenfolge: Fullscreen → Tafel → Schild
    → Kiste → To-do), reduced motion, Kontrast auf Tafel und Holz, Screenreader liest den
    Fortschritt. Screenshots in `docs/screenshots/`.

---

## 5a. Statisches Mock (2026-11-22)

`/dev/shed` (nur Development, unter `app/dev/`): Platzhalter ohne Logik, um die Komposition zu
prüfen, bevor der echte Studyroom umgebaut wird. Screenshots
`docs/screenshots/shed-mock-desktop.png` und `shed-mock-375.png`.

- Schuppenwand (`PlaceBackdrop world="garden"`) rundherum.
- Großes Fenster, ≈ 70 % der Höhe unter der Kopfzeile; darunter die schmale Fensterbank,
  auf der Robin rechts sitzt.
- Direkt darunter ein **schmales Regalbrett wie in der Nursery** (3-Slice-Brett mit Haltern),
  **keine Tischfläche, keine leere Zone**. Darauf nur Schiefertafel und Holzschild, gleiche
  Skalierung, gleiche Unterkante, je ein Kontaktschatten. Die Ambience-Kiste fehlt im Mock
  bewusst (später klein daneben oder im Panel).
- To-do-Zettel an der Wand rechts neben dem Fenster (mobil unter dem Brett), genagelt.
- Ranke als Platzhalter: links hoch und oben entlang.

Damit entschieden: Frage 1 = **zwei Bretter** (Fensterbank + Regal), Frage 2 = links + oben.

## 6. Offene Entscheidungen

1. **Fensterbrett und Regalbrett:** zwei Bretter übereinander (Fensterbank direkt am Fenster,
   Regal mit Abstand darunter) – so wie beschrieben – oder ist die Fensterbank selbst das
   Regal (Tafel, Schild, Kiste und Robin auf einem Brett)? Zwei Bretter sind näher an der
   Nursery, eins spart Höhe für den Garten, vor allem mobil.
2. **Ranke:** neu bauen (es gibt in der Nursery keine). Weg links + oben wie oben
   vorgeschlagen, oder rundherum?
3. **Wo steht der Reward-Zettel** – an der Tafel (Vorschlag) oder an der Wand neben dem To-do?
