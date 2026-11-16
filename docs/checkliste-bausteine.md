# Checkliste Schritt 0 – Bausteine auf `/dev/components`

Ziel: Alle wiederverwendbaren Bausteine der Journal-Ebene existieren, sind auf einer Testseite sichtbar und dokumentiert. Danach baut jede Seite nur noch mit diesen Bausteinen, statt neue Varianten zu erfinden.

Grundlage: `docs/robin-field-study-konzept.md` und der Skill `robin-design`.

---

## A. Vorbereitung (einmalig)

- [ ] Skill `robin-design` gespeichert, `bloomly-design` deaktiviert
- [ ] Eigenen Branch anlegen, z. B. `feature/building-blocks` (abgezweigt von `dev`)
- [ ] Vorher-Screenshots aller Seiten machen (Studyroom, Garden, Shop, Statistics, Settings, Sign-in)
- [ ] `/teach-impeccable` ausführen und dabei mitgeben:
  - [ ] Geschichte „reisender Gärtner“ und Leitsatz
  - [ ] Die drei Ebenen und die Faustregel
  - [ ] Verbotsliste
  - [ ] Hinweis: Bei Konflikten gilt `robin-design`
- [ ] Ordner für die Bausteine festlegen, z. B. `components/journal/`
- [ ] Ordner für UI-Assets festlegen, z. B. `public/ui/`

---

## B. Fundament

Die Bausteine brauchen Schrift, Farben und Material. Deshalb kommt das zuerst.

### B1. Schriften
- [ ] Drei Schriften über `next/font` einbinden (Kandidaten: Fraunces, Courier Prime, Caveat)
- [ ] CSS-Variablen anlegen: `--font-display`, `--font-label`, `--font-hand`
- [ ] Auf der Testseite eine Schriftprobe aller drei Rollen zeigen (Überschrift, Etikett, Notiz, große Zahl)
- [ ] Entscheidung treffen und in `docs/ROBIN.md` eintragen
- [ ] Regel notieren: Handschrift nur für Robins Stimme

### B2. Farb-Tokens (`app/globals.css`, `@theme`)
- [ ] Bestehende Tokens behalten: Canvas `#FBF7EF`, Primary `#4CA65A`, Ink `#3B3A36`, Coin `#F2B33D`, XP `#C77B3C`, Gold `#C9A227`
- [ ] Neu ergänzen:
  - [ ] Papier: Grundton, dunklere Abstufung, Linienfarbe
  - [ ] Tinte: Standard, gedämpft (Kontrast ≥ 4.5:1 auf Papier prüfen!)
  - [ ] Klebeband: 2 Töne, halbtransparent
  - [ ] Stempel: Garden-Grün, Rostrot, Tintenblau
  - [ ] Schatten: ein weicher Papierschatten (warm, nicht grau)
- [ ] Alle Tokens als Farbfelder auf der Testseite anzeigen

### B3. Material-Assets (generiert, kein Fotorealismus)
- [ ] Papiertextur, kachelbar
- [ ] 2–3 Klebestreifen (transparenter Hintergrund)
- [ ] Etikett-Rahmen (als 9-Slice nutzbar)
- [ ] Freezer-Feder als Icon
- [ ] Vorhandene Assets prüfen, ob sie zum Material passen: `Goldmünze mit funkelndem Stern.png`, `xp.png`, `streak_flame.png`, `leaf.png`, `Robin_neutral2.png`, `Robin_happy2.png`, `Robin_sad2.png`
- [ ] Assets mit englischen, sprechenden Namen in `public/ui/` ablegen (z. B. `coin.png`, `tape-1.png`)
- [ ] Dateigrößen verkleinern (Ziel: unter 200 KB pro UI-Asset, WebP oder komprimiertes PNG)

---

## C. Testseite `/dev/components`

- [ ] Route `/dev/components` anlegen
- [ ] In Production nicht erreichbar (`notFound()` außerhalb von Development)
- [ ] Aufbau: ein Abschnitt pro Baustein, alle Varianten nebeneinander
- [ ] Zwei Hintergründe zum Umschalten:
  - [ ] Papier (Journal-Ebene)
  - [ ] Garten-Screenshot (prüft, wie Bausteine im Studyroom wirken)
- [ ] Schalter für `prefers-reduced-motion`-Test (oder Hinweis, wie man es im Browser simuliert)

---

## D. Bausteine

### Ablauf für jeden Baustein
1. [ ] Kleiner Prompt an Claude Code: genau dieser eine Baustein
2. [ ] Plan lesen und prüfen, dann ausführen lassen
3. [ ] Auf der Testseite ansehen, auf beiden Hintergründen
4. [ ] `/critique` → Rückmeldung als neuer kleiner Prompt umsetzen
5. [ ] `/audit` → Kontrast, Fokus, Tastatur, Handy-Breite
6. [ ] Gegen die Verbotsliste prüfen
7. [ ] Committen

**Prompt-Vorlage:**
> Lies den Skill `robin-design` und `docs/robin-field-study-konzept.md`. Baue nur den Baustein `<Name>` in `components/journal/`. Anforderungen: <aus der Liste unten kopieren>. Zeige alle Varianten auf `/dev/components`. Erstelle zuerst einen Plan und warte auf meine Freigabe.

---

### D1. `PaperPanel` – ersetzt die weiße Karte
- [ ] Varianten: `plain`, `lined`, `grid`
- [ ] Klebeband: `none`, `top`, `corners`
- [ ] Leichte Drehung optional (`tilt`), Standard: keine
- [ ] Innenabstände: `sm`, `md`, `lg`
- [ ] Semantisch als `section` oder `div` nutzbar
- **Abnahme**
  - [ ] Funktioniert bei 240 px und bei 1000 px Breite
  - [ ] Text ist auf Papier gut lesbar (≥ 4.5:1)
  - [ ] Kein reines Weiß, kein grauer Standardschatten

### D2. `Label` – ersetzt Großbuchstaben-Labels und Chips
- [ ] Schreibmaschinenschrift, normale Groß-/Kleinschreibung
- [ ] Varianten: `tag` (Etikett mit Doppelrahmen), `inline` (nur Text, klein)
- [ ] Optional: Titel + Wert (z. B. „Studied today · 1 h 25 m“)
- [ ] Optional: leichte Drehung
- **Abnahme**
  - [ ] Kein `uppercase` und keine Sperrung
  - [ ] Gut lesbar ab 12 px

### D3. `RobinNote` – Robins Stimme
- [ ] Handschrift-Font, zwei Tintenfarben (Standard, Rostrot)
- [ ] Optional mit Mini-Robin: `mood` = `neutral` | `happy` | `sad` (vorhandene Robin-Assets)
- [ ] Optional: kleiner Pfeil, der auf etwas zeigt
- [ ] Empfohlene Länge: maximal 1–2 kurze Sätze
- **Abnahme**
  - [ ] Wird nie für Buttons, Preise oder wichtige Zahlen verwendet
  - [ ] Ist auch ohne Bild verständlich (Robin-Bild mit leerem `alt`, da dekorativ)

### D4. `Stamp` – Wochen-Stempel, Ortsstempel, Briefmarken-Abstempelung
- [ ] Formen: `round`, `rect`, `double`
- [ ] Farbe aus den Stempel-Tokens
- [ ] Text: oben, Mitte (groß), unten
- [ ] Optional: Pflanzenbild in der Mitte
- [ ] Drehung als Prop, leichte Transparenz, leicht unregelmäßiger Druck
- [ ] Animation „aufdrücken“ (scale 1.15 → 1), nur wenn `prefers-reduced-motion` nicht aktiv
- **Abnahme**
  - [ ] Inhalt auch für Screenreader lesbar (kein reines Bild)
  - [ ] Sieht auf Papier und auf dem Garten-Screenshot gut aus

### D5. `Button` – Labels sind Papier, Buttons sind Gegenstände
- [ ] Varianten: `primary` (Hauptaktion im Material des Ortes, Garten-Welt: Holzschild `button-wood.webp`), `secondary` (Tintenrahmen ohne Füllung), `quiet` (unterstrichener Text)
- [ ] Holzschild: Enden mit den Nägeln fix, Mitte als nahtlose Kachel wiederholt statt gedehnt (Astknoten verschmiert nicht)
- [ ] Schrift auf dem Holz eingebrannt in `wood-ink`
- [ ] Größen: `md`, `lg`
- [ ] Keine harte Kante unten, kein Etikett-Rahmen, keine Pille
- [ ] Hover hebt minimal an (warmer drop-shadow wird größer), Active sinkt leicht ein – nur ohne `prefers-reduced-motion`
- [ ] Zustände: hover, active, focus, disabled (primary: verblasstes Holz), loading (gleiche Breite)
- [ ] Optional mit Icon links
- [ ] Auch als Link nutzbar (`a`), ohne Button-im-Link
- **Abnahme**
  - [ ] Mindestens 44 px hoch
  - [ ] Sichtbarer Fokus-Rahmen, der zum Material passt (nicht der blaue Standardrahmen)
  - [ ] Textkontrast ≥ 4.5:1, auch auf der dunkelsten Holzmaserung
  - [ ] `secondary` und `quiet` nur auf Papier, nie direkt auf dem Garten
  - [ ] Nie Gold

### D6. XP-Anzeige: `XpSeedRow` (Standard) und `XpSeedJar` (Journal)
Entschieden 2026-11-16: Saatreihe statt Lineal (`XpRuler` verworfen und entfernt).
- [ ] `XpSeedRow`: Props `value`, `max`, `level`, `size` (`compact` | `large`), Rest und `ref` durchgereicht
- [ ] Tintenfurche mit 10 flachen Pflanzgruben (compact flacher, mehr Abstand), ein Samen (`seed.webp`, ≈ 0,8 × Grube, Rand sichtbar) je volles Zehntel des Levels
- [ ] Angefangenes Zehntel: halb vergrabener Samen im nächsten Loch, in Vierteln (25 / 50 / 75 %), Erde sinkt dezent
- [ ] „Lv“ + Levelzahl links, Keimling rechts (large: „Lv 9“ in Courier daneben, compact ohne Zahl), „42 / 70 XP“ daneben
- [ ] Neuer Samen fällt mit kleinem Bounce ins Loch (angefangener wird ohne Fall voll); beim ersten Rendern nichts; ohne Bewegung bei reduced-motion
- [ ] `compact` ≤ 2rem hoch (Kopfzeile), `large` zweizeilig (Journal)
- [ ] Schmale Zeile: per Container-Query „/ 70“ ausblenden, „42 XP“ bleibt als letzte Stufe
- [ ] Levelwechsel: keine Rückwärts-Animation, sofort der neue Zustand
- [ ] `XpSeedJar`: nur eine Größe (Glas 9rem, Journal-Seite), `seed-jar.webp` + Samenmuster auf die Innenform begrenzt, steigt mit ease-out, „Lv“ + Levelzahl zweizeilig auf dem Anhänger
- [ ] Beide als `progressbar`: `aria-label` nur „Level N“, Zahlen über `aria-valuetext`
- [ ] `value`/`max` mit `Number.isFinite` abgesichert; Größen in rem/em; Zähler als eigene Kindkomponente
- **Abnahme**
  - [ ] XP-Farbe Kupfer `#C77B3C` für Samen/Füllung, Zahlen in Tinte (nicht Kupfer)
  - [ ] Samen ≥ 3:1 auf Papier (`multiply` + feine `xp-deep`-Kontur)
  - [ ] Zahlen mit `tabular-nums`
  - [ ] Steht direkt auf Papier, nie auf dem Garten
  - [ ] Bei 375 px ohne horizontalen Scroll

### D7. `GameIcon` – eigene Icons statt Lucide
- [ ] Eine Komponente mit `name` und `size`
- [ ] Icons: `coin`, `xp`, `streak`, `freezer`
- [ ] Platzhalter-Slots für die Navigations-Icons (kommen in Schritt 1)
- **Abnahme**
  - [ ] Scharf bei 16, 24 und 48 px
  - [ ] Passt optisch zu Papier und Garten-Assets

### D8. Eingabefelder (werden für Studyroom und Settings gebraucht)
- [ ] `Checkbox`: Tintenhaken statt Standard-Häkchen
- [ ] `TextInput`: Linie auf Papier statt Kasten
- [ ] `Slider`: im Material (für die Sounds)
- [ ] `ChoiceGroup`: Auswahl wie 25/5 · 50/10 · Flexible, ohne Pills
- **Abnahme**
  - [ ] Echte `input`-Elemente mit `label`, per Tastatur bedienbar
  - [ ] Fokus sichtbar

---

## E. Abschluss

- [ ] Alle Bausteine auf einer Testseite, beide Hintergründe geprüft
- [ ] Screenshot der fertigen Testseite machen
- [ ] Gesamte Testseite gegen die Verbotsliste prüfen
- [ ] `/audit` einmal über die ganze Testseite
- [ ] In `docs/ROBIN.md` dokumentieren:
  - [ ] Liste aller Bausteine mit Props
  - [ ] Wofür welcher Baustein (und wofür nicht)
  - [ ] Endgültige Fonts und neue Tokens
- [ ] Falls Namen oder Props vom Skill abweichen: `robin-design` aktualisieren
- [ ] Branch in `dev` mergen
- [ ] Weiter mit Schritt 1: App-Rahmen und Navigation
