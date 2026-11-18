# Studyroom als Pflanztisch – Plan

Folgt auf `docs/studyroom-plan.md` (Zettel mit Klebeband, umgesetzt). Neue Richtung: der Studyroom
ist Robins **Pflanztisch im Garten**. Ebene **Ort**, Material der Garten-Welt: Holz, Schiefer/Kreide,
Jute/Schnur, Terrakotta, Packpapier. Papier und Tinte nur, wo jemand schreibt (Notizen, To-do).

## Entschieden (2026-11-18)

1. **Bedienelemente auf Schiefer und Holz:** `ChoiceGroup`, `TextInput`, `Slider` bekommen
   `surface="slate"` (Kreide) und `surface="wood"` (Brandschrift, Schnur-Slider). Der Fokusrahmen
   bleibt derselbe.
2. **Fortschrittsschiene = Vorderkante des Pflanztischs:** Holzleiste, füllt sich mit einem
   Kreidestrich, in der Pause gestrichelt. `role="progressbar"` bleibt.
   *Vor Schritt 7 klären:* liegt die Leiste an der Kante zum Garten (wo die Schiene heute ist)
   oder unten am Tisch?
3. **Pause-Notiz** als kleiner Zettel, mit einem Nagel an den Tafelrahmen geheftet.
4. **Reward und Complete** bleiben in diesem Durchgang unverändert (Papier über dem Garten).
5. **700–1100 px zweispaltig:** Tafel oben über die volle Breite, To-do und Ambience nebeneinander.
6. **Keine Packpapier-Anhänger als Titel.** Timer ohne Titel; der To-do-Titel steht oben auf dem
   Zettel; „Ambience“ ist in die Vorderseite der Kiste eingebrannt (`wood-ink`).
7. **Vollbild-Knopf** als kleines Holzplättchen mit Icon.
8. **`HangTag`** erst bauen, wenn wir ihn wirklich brauchen.

## Befunde

- **„Mountains · Lv 20“ abgeschnitten:** Die Place-Zeile war bei 1440 px 420 px breit, die Box
  412 px; die Optionen brachen nicht um, und der scrollende Zettelkörper schnitt die Ellipse ab.
- **Slider-Startwerte:** alle 0 (stumm), wie in der alten Version; richtig, solange es kein Audio
  gibt. Gespeichert wird nichts; `study_room_settings.sound_volumes` (jsonb, Standard `{}`)
  bleibt ungenutzt, bis Audio kommt.

## Aufbau

**Desktop (ab 1100 px, kein Seitenscroll):** oben der Garten, frei bis auf den Vollbild-Knopf.
Darunter eine helle Holz-Arbeitsfläche über die volle Breite, darauf genau drei Gegenstände in
dieser Reihenfolge mit gleicher Unterkante: Schiefertafel (Timer), Papierzettel mit Nagel
(To-do), flache Holzkiste (Ambience). Keine weitere Deko.

```
┌──────────────────────────────────────────────── [▣]┐  ← Holzplättchen (Vollbild)
│                    Garten (frei)                   │
├────────────────────────────────────────────────────┤
│░░░░░░░░░░ helle Holz-Arbeitsfläche ░░░░░░░░░░░░░░░░│
│ ┌═══════════┐      •           ┌────────────────┐  │
│ ║ 24:59     ║  ┌──────────┐    │ Rain ──●  …    │  │
│ ║ Next up   ║  │ To-do    │    │ Place: …       │  │
│ ║ Modus     ║  │ ☐ …      │    ├────────────────┤  │
│ ║ [Start]   ║  │ New __   │    │   AMBIENCE     │  │ ← eingebrannt
│ └═══════════┘  └──────────┘    └────────────────┘  │
│▔▔▔▔▔▔▔▔▔▔▔▔▔▔ gleiche Unterkante ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔│
└────────────────────────────────────────────────────┘
```

**Mobil (< 1100 px, bis 320 px ohne Seitenscroll):** Garten ca. 44 dvh, darunter die Holzfläche
durchgehend; Tafel über die volle Breite (Start ohne Scrollen erreichbar), darunter To-do und
Ambience – 700–1100 px nebeneinander, darunter untereinander.

## Assets (später generieren; bis dahin CSS-Platzhalter)

WebP in `public/ui/`, Originale in `design-src/ui/`.

| Asset | Form | Hinweise |
|---|---|---|
| Holzfläche | nahtlose Kachel, ca. 1024 × 512 | helles Holz, wenig Maserung, Bretter quer |
| Schieferrahmen | 9-Slice, Rahmen ca. 28 px | Holzrahmen, Ecken fix, innen transparent |
| Schiefer-Innenfläche | nahtlose Kachel, ca. 512² | dunkel grau-grün, leichte Kreidewischer, ruhig |
| Nagel | Sprite, ca. 32 px | schräger Schmiedenagel mit kleinem Schatten |
| Holzkiste | 9-Slice, Vorderkante ca. 24 px | flach, leicht von oben, Boden etwas dunkler |
| Holzplättchen | 3-Slice oder fest, ca. 44 px | kleines Brettchen für den Vollbild-Knopf |

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
