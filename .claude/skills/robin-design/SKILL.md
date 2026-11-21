---
name: robin-design
description: Design-System und UI/Animations-Richtlinien für Robin – Garden Journal (Lern-App, ehemals Bloomly). IMMER verwenden, wenn UI für Robin gebaut, gestylt oder überarbeitet wird – Studyroom, Garden, Nursery, Journal, Herbarium, Settings, Sign-in, Navigation, Bausteine wie PaperPanel, Label, RobinNote, Stamp, Button, GameIcon, XpSeedRow, XpSeedJar, Checkbox, TextInput, Slider, ChoiceGroup, Micro-Animationen, Farben, Schriften, Microcopy. Auch bei Fragen zu XP/Coins/Level/Streak-Zahlen oder Welt-Freischaltungen in der UI. Hat Vorrang vor bloomly-design und vor allgemeinen Design-Skills (frontend-design, impeccable).
---

# Robin Design System

Quelle der Richtung: `docs/robin-field-study-konzept.md`. Bei Widerspruch gilt das Konzept,
dann dieser Skill, dann allgemeine Design-Skills.

---

## 1. Die Geschichte

**Robin ist ein reisender Gärtner.** Er zieht von Ort zu Ort und legt dort Gärten an. Du lernst,
der Garten wächst, und Robins Journal hält fest, was ihr gemeinsam gepflanzt habt.

**Leitsatz für jede UI-Entscheidung:** *„Du lernst, ihr pflanzt, das Journal erinnert sich.“*

Vorbild: Pflanzenjäger des 19. Jahrhunderts und das klassische Gartentagebuch (wann gesät, wann
geblüht, welche Sorte). Das Journal dokumentiert nichts Gefundenes, sondern **das, was du selbst
geschaffen hast**.

| Verb | Bedeutung | Wo |
|---|---|---|
| **Wachsen lassen** | Kernloop: lernen, Samen pflanzen, Garten gestalten | Studyroom, Garden |
| **Festhalten** | Das Journal erinnert sich an deine Arbeit | Journal, Herbarium |
| **Weiterreisen** | Progression: neue Orte, neue Samen, neuer Garten | Briefmarken, Stempel, Freischaltungen |

**Das verbindende Objekt:**
Samentüte (Nursery) → Pflanze wächst durch Lernzeit (Garden) → gepresste Blüte (Herbarium).

---

## 2. Die drei Ebenen

| Ebene | Inhalt | Je Welt anders? |
|---|---|---|
| **Reise** | Robin legt an jedem Ort einen Garten an | nie |
| **Journal** | Rahmen um alles: Papier, Tinte, Etiketten, Klebeband, Handschrift, Lesezeichen-Navigation | nie |
| **Ort** | Der aktuelle Garten mit eigenem Material, eigenen Samen, eigenem Händler | ja |

**Faustregel:**
- Alles, was **über dich** ist (Journal, Herbarium, Settings), lebt im **Journal** und ist weltunabhängig.
- Alles, was **an einem Ort** ist (Garden, Nursery), trägt das **Material des Ortes** – in Welt 1
  also Holz und Gärtnerei.
- Der Studyroom ist Robins **Pflanztisch im** Garten: Garten oben, darunter der Tisch mit den
  Gegenständen des Ortes (Schiefertafel, Holzkiste) und einem genagelten Zettel zum Schreiben.

Vor jeder Komponente fragen: Zu welcher Ebene gehört sie? Daraus folgt das Material.

---

## 3. Die Screens

Navigation (umgesetzt 2026-11-17, Routen `/studyroom`, `/garden`, `/nursery`, `/journal`, `/settings`; `/shop` und `/statistics` leiten dauerhaft weiter): **Studyroom · Garden · Nursery · Journal · Settings** als **Lesezeichen-Bänder** (`Bookmark`, Variante A: hängende Bänder, das aktive länger und in `stamp-green`; unter 55rem nur Icons) am
Journal-Rahmen (keine Pills, keine weiße Top-Leiste). Herbarium: eigener Reiter oder Kapitel im
Journal (noch offen).

### Studyroom
- **Pflanztisch** (entschieden 2026-11-18, Plan: `docs/studyroom-pflanztisch-plan.md`): oben
  der Blick auf den eigenen, live gerenderten Garten, frei bis auf den Vollbild-Knopf (kleines
  Holzplättchen mit Icon). Darunter eine dezente, helle Holz-Arbeitsfläche über die volle
  Breite, darauf **genau drei Gegenstände** in fester Reihenfolge, gleiche Unterkante:
  - **Timer** als kleine Schiefertafel mit Holzrahmen, ohne Titel. Zeit in Fraunces als
    `TabularNumber` in Kreide; Modus, Rounds und „Start session“ (Holzschild) auf der Tafel.
  - **To-do** als Papierzettel, mit einem Nagel aufs Holz geheftet; der Titel steht oben auf
    dem Zettel.
  - **Ambience** als flache Holzkiste mit den Reglern und Place; „Ambience“ ist in die
    Vorderseite eingebrannt (`wood-ink`).
  Keine weitere Deko. Robins Pause-Notiz ist ein kleiner Zettel, an den Tafelrahmen genagelt.
- Kein Glassmorphism, auch nicht „nur ein bisschen Blur“.
- Fortschritt: **linear, als Vorderkante des Pflanztischs** – eine Holzleiste, die sich mit
  einem Kreidestrich füllt, in der Pause gestrichelt.
- Während der Timer läuft, tritt die UI zurück. Nach Session-Ende kommt der orchestrierte
  Reward-Moment (siehe 8).

### Garden
- Der Garten, den du gerade anlegst. Hier passiert das Bauen; freie, nicht rasterstrenge Platzierung.
- Inventar als Korb / Samentüten, nicht als Grid aus Kacheln.
- Wachsende Objekte als „in Arbeit“ erkennbar (leichter Shimmer), ohne Kitsch.

### Nursery (bisher Shop)
- Die Gärtnerei vor Ort. Samentüten mit Pflanzenbild, Fantasie-Lateinnamen und Wachstumszeit.
- Preis auf einem **Steckschild**, gesperrte Items mit **Wachssiegel + Level**. Gesperrtes bleibt
  sichtbar – Vorfreude statt Verstecken.
- Tütenrückseite zeigt die 3 Wachstumsstufen (Klick/Hover dreht die Tüte).
- Material Welt 1: Holzwand/Regal. Andere Orte: anderer Händler, regionale Samen, gleiches Prinzip.
- Kein generisches Produkt-Grid. Preise trotzdem klar lesbar, nie ins Bild „hineingemalt“.

### Journal (bisher Statistics)
- Reisekapitel in Robins Gartentagebuch, als **aufgeschlagenes Buch** (`JournalSpread`,
  überarbeitet 2026-11-17, Einband 2026-11-20): dicker Einband rundherum: der grüne Lederrahmen
  (`public/ui/journal-cover.webp`, Original `design-src/ui/einband.png`, nicht das orange
  `leather-cover`) als 9-Slice mit festen Ecken (abgestoßene Kanten) und wiederholten
  Seitenkanten (`round`, damit die Naht nicht verzerrt); sichtbar 1,4rem an den Seiten, ab
  48rem 2,1rem; die Seiten liegen im Loch des Rahmens; Abstand über dem Buch `space-5`;
  `--color-cover` nur noch CSS-Fallback), die Seiten etwas kleiner als der Einband, ab 48rem
  Buchbreite zwei Seiten mit Falz, außen ein breiterer Seitenblock aus feinen Linien, ein schmales
  Lesebändchen (0,4rem, `--color-ribbon`, gedämpftes Terrakotta – nie `stamp-green`, damit es
  nicht wie Navigation wirkt) kommt oben aus dem Falz und hängt unten über die Kante, dekorativ.
  Schmaler: eine Seite, Einband rundherum, Bändchen am rechten Rand. Seiten sind geschnittenes
  Buchpapier (Papierton + `paper-texture.webp`), nicht der gerissene `PaperPanel`. Der Einband
  ist gemalt (`journal-cover.webp`, siehe oben); Bändchen und Seitenkanten sind noch
  CSS/SVG-Platzhalter, gemalte Assets kommen über `ribbonImage` und `pageEdgesImage`
  (geplant: `ribbon.webp`, `page-edges.webp`).
- **Schreibtisch** (entschieden 2026-11-20): auf `/journal` (und Sign-up in Journal-Form) liegt
  das Buch auf einem gemalten Holztisch: `public/ui/desk.webp` als nahtlose Kachel (1254 px,
  gezeigt mit 627 px für 2x-Schärfe; Original `design-src/ui/desk.png`), Baustein
  `components/journal/desk.module.css` (`.desk`, `.bookOnDesk`). `--color-desk` ist der
  Mittelton der Kachel, bis sie geladen ist. Das Buch wirft dort einen warmen Schatten
  (`--filter-book-on-desk`).
- **Streak** als eingeklebtes Etikett mit der Sonne (`GameIcon streak`, `public/ui/icons/streak.webp`).
- **Today / Total** (entschieden 2026-11-17): **Today in `--color-stamp-green`, Total in
  `--color-ink`**, Zahlen in Fraunces als `TabularNumber`, mit handgezeichneter Unterstreichung.
- **Rechte Seite als Collage, ohne Seitentitel und ohne Courier-Zwischenzeilen** (entschieden
  2026-11-17): oben Glas und Gepäckanhänger als Gruppe (neben dem Glas „28 XP to Level 9“, nicht
  die XP-Zahl der Kopfzeile), darunter das Album: erreichte Orte als geklebte Briefmarken, nur der
  **nächste** Ort als Bleistift-Umriss „Not yet issued“, spätere Orte erscheinen nicht. Die
  **Wochen-Stempel stehen als eigene Reihe unten auf der rechten Seite**, leicht überlappend
  nacheinander gedrückt (entschieden 2026-11-20, vorher über den Marken). **Wochen ohne Lernzeit
  bekommen keinen Stempel und keine Lücke.** Der Gepäckanhänger ist mit Jute-Schnur
  (`--color-twine`, `LuggageTag tied`) an die Schnur am Hals des Glases gebunden.
- Wochen-Stempel = Poststempel des aktuellen Gartens: Lernzeit der Woche + Motiv.
  **Motiv (entschieden 2026-11-17):** die Pflanzenart mit dem meisten Wachstum in der Woche,
  als Näherung – Lernzeit der Woche, die auf wachsende Objekte fiel, **pro `item_id` summiert**
  (alle Objekte derselben Art zusammen; ein Objekt wächst von `planted_at` bis `grown_at`).
  Ohne Wachstum in der Woche: neutrales Motiv (Samen, `seed`). Quelle: View `v_weekly_study`.
- Briefmarke pro Garten (`PostageStamp`): „The Garden · est. Sep 2026“; nicht erreichte Orte:
  „Not yet issued“ mit Level. **Datum (entschieden 2026-11-17)** aus der abgeleiteten View
  `v_world_stamps` (nichts gespeichert): The Garden = Kontoanlage, spätere Orte = Tag, an dem
  die XP-Summe aus `reward_transactions` die Schwelle von `unlock_level` erreicht hat.
- Nächstes Ziel als Gepäckanhänger (`LuggageTag`, „Next stop“, `tied` am Glashals) mit XP bis zum nächsten Ort.
- Level-Fortschritt als großes Samenglas (`XpSeedJar`).
- Kalender: gepresste Blüte = Lerntag, Feder = Freezer-Tag (`streak_freezer_log`). **Verpasste
  Tage tragen kein Zeichen, nur eine etwas blassere Zahl (`ink-muted`)** (entschieden 2026-11-17,
  nach der Journal-Critique: das Journal erinnert sich an das, was gewachsen ist, nicht an Lücken).
  Legende nur Blüte und Feder. Klick auf einen Tag öffnet eine kurze Zusammenfassung auf Papier.
- Leerzustand (ohne Streak und ohne Lernzeit, `EmptyPage`): linke Seite leer, Bleistiftskizze
  (Keimling, die Blüte nur gestrichelt) und `RobinNote` mit Robin als Bild (Onboarding) **mittig**;
  Streak, Today/Total, Kalender und Wochen-Stempel fehlen. Rechts das **Glas ohne Zahlen**
  (`caption={null}`, `showLevel={false}`), Next stop, und die **erste Marke größer** mit einem
  rostroten Stempel „Welcome“ über ihrem rechten Rand.
- **Keine sichtbare Seitenüberschrift** (entschieden 2026-11-17): das Buch spricht für sich, die
  Navigation sagt „Journal“. Das `<h1>Journal</h1>` bleibt, aber nur für Screenreader.

### Herbarium (neu)
- Sammelheft deiner eigenen Pflanzen. Erste voll erblühte Pflanze einer Art wird gepresst eingeklebt.
- Etikett: Name, Lateinname, Datum, Ort, Lernzeit, Ortsstempel
  („You grew this rose with 3 hours of study.“).
- Noch nicht gezogene Pflanzen als Bleistift-Umriss. Fortschritt z. B. „7 / 14 grown · The Garden“.

### Settings (und Sign-in/Sign-up)
- Leben im Journal-Rahmen: Papier, Etiketten, Tinte. Funktional, aber nie kalte Formular-UI.

---

## 4. Material-Set

Zwei Ebenen, zwei Sets: das **Journal-Set** (unten, weltunabhängig) und **ein Material-Set pro
Welt** für die Ort-Ebene. Neue Varianten nur, wenn kein Baustein passt.

### Material pro Welt (Ort-Ebene)

Entschieden 2026-11-18. Ein Ort baut nur aus seinem eigenen Set. **Papier und Tinte erscheinen
auf der Ort-Ebene nur dort, wo Robin oder der Nutzer etwas schreibt** (Robins Notizen, To-dos);
alles andere ist ein Gegenstand des Ortes.

| Welt | Material | Wofür (Beispiele) |
|---|---|---|
| **Garten** (Welt 1) | **Holz** | Arbeitsfläche, Rahmen, Kisten, Schilder (`primary`-Button), kleine Knöpfe als Holzplättchen; Schrift eingebrannt in `wood-ink` |
| | **Schiefer / Kreide** | Tafeln für Zahlen und Einstellungen (Studyroom-Timer); Schrift und Linien in Kreide |
| | **Jute / Schnur** | Spannen, Binden, Aufhängen (z. B. Slider-Spur als Schnur auf Holz) |
| | **Terrakotta** | Töpfe, Schalen, Behälter |
| | **Packpapier** | Anhänger, Tüten, Einwickeln (erst bauen, wenn gebraucht) |
| **Strand** (Ausblick) | Treibholz, Seil, Muscheln, Segeltuch, Sand | noch nicht entworfen |
| **Berge** (Ausblick) | Stein, Schiefer, Wolle/Filz, Eisen, Birkenrinde | noch nicht entworfen |

Neue Orte bekommen ihr Set, bevor ihre Screens gebaut werden; die Rollen (Fläche, Tafel,
Behälter, Schild, Bindung) bleiben gleich, nur das Material wechselt.

### Journal-Set

| Material | Wofür | Baustein |
|---|---|---|
| **Papier** | Jede Fläche, auf der Text steht; ersetzt die weiße Karte | `PaperPanel` |
| **Tinte** | Text, Linien, Unterstreichungen, Bleistiftskizzen für Leerzustände | – |
| **Klebeband** | Befestigt Zettel, Fotos, Marken; leicht schräg, 1–2 Streifen | `PaperPanel` (optional) |
| **Etiketten** | Überschriften, Kategorien, Werte; ersetzt Großbuchstaben-Labels | `Label` |
| **Stempel** | Orte, Wochen, Erfolge; rund oder eckig, leichte Drehung, Pflanzenmotiv | `Stamp` |

Weitere Bausteine: `RobinNote` (handschriftliche Notiz, optional mit Mini-Robin), `XpSeedRow`
(XP als Saatreihe, Standard), `XpSeedJar` (XP als Samenglas, nur Journal-Seite), `Button`
(`primary` / `ink` / `secondary` / `quiet`), `GameIcon` (eigene Icons), die Eingabefelder `Checkbox`,
`TextInput`, `Slider`, `ChoiceGroup`, die Navigation `Bookmark`, für die Journal-Seite
`PostageStamp` (Briefmarke pro Ort) und `LuggageTag` (Next stop) – beide Platzhalter-Material,
bis die gemalten Assets da sind –, `TabularNumber` für zählende
Zahlen und die gemeinsame Tinte `InkRule` / `InkFrame` / `InkArrow` / `FocusFrame`
(`components/journal/ink.tsx`).
Alle Bausteine leben auf `/dev/components`; Seiten bauen nur mit diesen. **Namen, Props, Wofür und
Wofür-nicht stehen in `docs/ROBIN.md` (§13, „Journal building blocks“)**; bei Abweichung gilt der
Code. Klammern, die der Code erzwingt: `PaperPanel` `tilt` ±3° (breite Panels ≤ 1°), `Label`
`tilt` ±2°, `Stamp` `rotate` ±15°.

Regeln:
- **Derselbe Ortsstempel** erscheint auf Samentüten, Wochen-Stempeln und Herbarium-Etiketten.
- Papier ist nie reinweiß, sondern Canvas/Sand mit Textur. Tiefe entsteht durch Material
  (Papierkante, Klebeband, Drehung) und einen warmen, eng anliegenden drop-shadow, der der
  Papierkante folgt – nie durch weiche, graue Kartenschatten (box-shadow).
- **Wölbung am Falz ist Material, kein Kartenschatten** (entschieden 2026-11-17): Im
  aufgeschlagenen Journal werden beide Seiten zum Falz hin leicht dunkler – ein weicher
  Verlauf nur in den Papiertönen (`paper` → `paper-deep` → `paper-line`), als
  `background-image` der Seite. Nie `box-shadow`, nie Grau oder Schwarz mit Transparenz. Der
  Verlauf ist schmal (erst ab ca. 85 % der Seitenbreite); die Seite hält zum Falz hin
  `space-7` Abstand, damit nichts Wichtiges – vor allem kein Stempel – im dunklen Bereich liegt.
- Raster-Assets (Papier, Klebestreifen, Etikett-Rahmen, Lesezeichen) im Stil der Garten-Assets,
  kein Fotorealismus. Dehnbare Assets als 9-Slice.
- **Papier ist ein Asset, keine CSS-Fläche** (entschieden 2026-11-14, B3): `PaperPanel` nutzt
  `public/ui/paper-note.webp` als 9-Slice (`border-image … fill`), damit gerissene, gealterte
  Ränder beim Dehnen nicht verzerren. Schatten per `filter: var(--filter-paper)`, **nicht**
  `box-shadow` (der säße am Rechteck statt am gerissenen Rand). Papier und Schatten liegen auf
  einem `::before` hinter dem Inhalt, nie als `filter` auf dem Panel selbst.
- Klebeband (`tape-long-*.webp`) bleibt im Bild deckend; Transparenz kommt per `opacity: 0.9` im Code.
- UI-Assets liegen als WebP in `public/ui/` (Ziel < 200 KB); PNG-Originale in `design-src/ui/`
  (von Git ignoriert).
- **Labels sind Papier, Buttons sind Gegenstände** (entschieden 2026-11-16, D5). Ein Button
  trägt nie einen Etikett-Rahmen und ist nie eine Pille. Auf der **Ort-Ebene trägt die Hauptaktion
  (`primary`) das Material des Ortes** – in der Garten-Welt Holz: `button-wood.webp` als
  Holzschild, Schrift eingebrannt in `wood-ink`. **Hauptaktion auf der Journal-Ebene = `ink`;
  Holzschild nur auf der Ort-Ebene** (entschieden 2026-11-20, zuerst Sign-up): derselbe
  handgezeichnete Tintenrahmen wie `secondary`, mit Tinte gefüllt, Text in `paper` (≈ 10:1);
  Hover/Active eine leichte Papiertönung (nur `opacity`), deaktiviert wie `secondary`.
  `secondary` ist ein Tintenrahmen ohne Füllung, `quiet` unterstrichener Text; `ink`, `secondary`
  und `quiet` nur auf Papier (`secondary`/`quiet` auch auf Schiefer, dort in Kreide), nie direkt
  auf dem Garten. Keine harte Kante unter Buttons.
- **Holzschild-Aufbau:** Enden mit den Nägeln fix (`button-wood.webp`, je 64 von 196 px), Mitte als
  nahtlose Kachel wiederholt statt gedehnt (`button-wood-middle.webp`), damit der Astknoten nie
  verschmiert. Die Enden laufen 60 px weich über die Mitte aus. Andere Orte bekommen eigene
  Schilder nach demselben Prinzip.
- **Eigene Icons im Asset-Stil** (Coin, XP-Samen, Streak, Freezer-Feder, Navigation) – kein Lucide.
  `GameIcon` (`components/journal/game-icon.tsx`, D7; Größen 16 | 24 | 48 in rem; dekorativ,
  `alt` nur wenn das Icon allein Bedeutung trägt). **Größenregel (entschieden 2026-11-17):
  Spiel-Icons (`coin`, `xp`, `streak`, `freezer`) müssen ab 16 px funktionieren;
  Navigations-Icons (`studyroom`, `garden`, `nursery`, `journal`, `herbarium`, `settings`)
  werden mindestens in 24 px verwendet.** Neue Icons danach entwerfen: Spiel-Icons mit
  einfacher, kräftiger Silhouette. Fehlende Icons bleiben gestrichelte Platzhalter.
- **Eingabefelder** (D8, `components/journal/`: `checkbox.tsx`, `text-input.tsx`, `slider.tsx`,
  `choice-group.tsx`): **stehen auf Papier** (To-dos, Settings, Sign-in) **oder, auf der
  Ort-Ebene, auf einem Gegenstand des Ortes** – `surface="slate"` (Kreide auf Schiefer) und
  `surface="wood"` (Brandschrift auf Holz, Slider als Schnur) für `ChoiceGroup`, `TextInput`
  und `Slider` (entschieden 2026-11-18). Nie direkt auf dem Garten. Jede Fläche muss für Text
  ≥ 4,5:1 erreichen; der Fokusrahmen bleibt auf allen Flächen derselbe. Echte `input`-Elemente mit `label`, per Tastatur bedienbar, restliche Props und `ref`
  gehen durch, Größen in rem, Zeilen ≥ 44 px hoch. Fokus nach der gemeinsamen Fokus-Regel
  (unten). Deaktiviert = gestrichelte Bleistiftlinie,
  `ink-muted` (5,18:1). Labels in Courier ab 14 px, Eingaben in Fraunces ≥ 16 px (iOS-Zoom).
  - `Checkbox` (`strike` für To-dos): gezeichnetes Tintenkästchen; beim Abhaken malt sich ein
    handschriftlicher Haken in ca. 250 ms (`stroke-dashoffset`, Ausnahme von „nur transform/opacity“,
    weil sich der Strich nur so malen lässt), ohne Bewegung bei reduced motion. Erledigter Text
    dünn durchgestrichen in Tinte, **nicht grau**.
  - `TextInput` (`label`, `hint`, `error`): keine Box, nur eine gezeichnete Schreibzeile
    (`--ink-fine`); bei Fokus wird sie zum Strich (`--ink-stroke`) und der Fokusrahmen legt sich
    um die Zeile (nicht ums Label). Fehler in
    `error-deep` (5,37:1 auf Papier; `error` hat nur 2,87:1 und ist für Text tabu), per
    `aria-describedby` und `aria-invalid` verbunden.
  - `Slider` (`label`, `thumb`, `unit` / `formatValue`): Spur als gezeichnete Linie (`--ink-fine`),
    Füllung dieselbe Linie als Strich (`--ink-stroke`), am Griff per `clip-path` abgeschnitten;
    Fokusrahmen um den Griff, bleibt gerade, auch wenn der Griff gedreht ist; der echte Range-Input liegt unsichtbar darüber. **Griff `pebble` ist Standard**
    (Kieselstein, entschieden 2026-11-17), `ink` (Tintenklecks) bleibt Option. `unit` statt
    `formatValue`, wenn die Seite eine Server-Komponente ist.
  - `ChoiceGroup` (`legend`, `options`): `fieldset` mit echten Radios; Optionen als Fraunces-Text
    nebeneinander, die gewählte mit handgezeichneter Tinten-Ellipse umkreist (kein Fettdruck, kein
    Pill). Pfeiltasten wechseln die Wahl. Kurze Optionen (≈ 3 × ≤ 8 Zeichen), sonst Umbruch.
- **Tinte ist immer von Hand gezeichnet** (entschieden 2026-11-17, Audit nach D8): jede Linie,
  jeder Rahmen in Tinte hat einen leichten, natürlichen Wackler – Checkbox-Kästchen,
  ChoiceGroup-Ellipse, TextInput-Zeile, Slider-Spur, Rahmen des `secondary`-Buttons, XP-Furche.
  Dafür gibt es `InkRule` (Linie), `InkFrame` (Rahmen) und `InkArrow` (kleiner Pfeil nach
  rechts zwischen Schritten, im Fluss, Seitenverhältnis fest; 2026-11-21, Sign-up) in
  `components/journal/ink.tsx`: SVG mit
  `preserveAspectRatio="none"` und `non-scaling-stroke`, Farbe/Stärke/Strichelung über
  `--ink-color`, `--ink-width`, `--ink-dash` auf der eigenen Klasse. Keine geraden CSS-`border`
  als Tintenlinie. **Ausnahmen (gedruckt, nicht gezeichnet):** die Linien im `lined`/`grid`
  `PaperPanel` und alles am `Stamp`. Text-Unterstreichungen (`quiet`-Button) bleiben typografisch.
- **Drei Strichstärken** (Tokens in `:root`): `--ink-fine` 1px = Hilfslinien, auf denen man
  schreibt oder schiebt (TextInput-Zeile, Slider-Spur, Erdlinie, Durchstreichen); `--ink-line`
  1,5px = Rahmen und Umrisse (Checkbox, Ellipse, `secondary`-Button, XP-Furche, Keimling,
  Fußabdrücke); `--ink-stroke` 2,25px = bewusste Striche (Haken, Slider-Füllung, Robins Pfeile,
  Fokusrahmen). Keine anderen Werte; in skalierten SVGs immer mit `non-scaling-stroke`. Stempel
  sind gedruckt und behalten ihre eigenen Ringstärken.
- **Eine Fokus-Sprache für alle Bedienelemente** (entschieden 2026-11-17): `FocusFrame` aus
  `ink.tsx` – derselbe handgezeichnete Rahmen in `--ink-stroke`, Tinte, über einem Papier-Halo
  (`--ink-stroke` + 4 px in `paper`), damit er auch auf dem Garten sichtbar ist. Er liegt um das
  ganze Bedienelement mit etwas Luft: Button (6–7 px), Checkbox-Kästchen, Slider-Griff,
  ChoiceGroup-Wort samt Ellipse, TextInput-Zeile (dort wird zusätzlich die Linie zum Strich). Nur
  bei `:focus-visible`, ohne Übergang, nie der Browser-Ring; im Hochkontrastmodus
  (`forced-colors`) stattdessen eine `outline` in `CanvasText`. Neue Bedienelemente nutzen
  denselben Rahmen, keine eigene Fokusvariante.
- **RobinNote** (`components/journal/robin-note.tsx`, D3): **Robins Stimme = Füllertinte blau
  (`stamp-blue`) + Signatur „— R.“ mit zwei kleinen Vogelfußabdrücken** (entschieden 2026-11-16).
  Caveat ab 22 px (Standard 24 px), Zeilenbreite 13em (≈ 32 Zeichen), 1–2 kurze Sätze. Keine
  Tintenwahl: Rostrot bleibt Daten und Stempeln vorbehalten. Optional handgezeichneter Pfeil
  (`arrow` `up` | `down` | `left` | `right`), der an der letzten Zeile über den Rand hinausragt.
  `surface="paper"` nur in einem `PaperPanel`, über dem Garten immer `surface="slip"` (eigener
  Zettel mit honigfarbenem Klebestreifen) – Handschrift steht nie direkt auf Illustration.
  **Robin als Bild (`mood` `neutral` | `happy` | `sad`) nur bei besonderen Momenten** (Onboarding,
  First bloom, Level-up); dann ersetzt er die Fußabdrücke, die Signatur bleibt. Regeln: nie für
  Buttons, Preise oder wichtige Zahlen; höchstens eine RobinNote pro Screen; muss ohne Bild
  verständlich sein (Bild, Signatur, Fußabdrücke und Pfeil sind dekorativ).
- **Stamp** (`components/journal/stamp.tsx`, D4): gedruckt, nicht gezeichnet. Formen `round`
  (Poststempel, Doppelring, Text per `textPath` oben/unten), `rect`, `double` (Doppelrahmen);
  `top` / `center` / `bottom`, `center` in Fraunces 600 (große Zahl), Ring- und Zeilentext in
  Courier Prime ≥ 13 px. Farben nur `stamp-green` | `stamp-rust` | `stamp-blue`.
  **Druck-Optik nur auf Rahmen, Ringen und Mitte** (Rahmen, Ringe, Pflanze: Deckkraft 0.85 + gemeinsamer SVG-Filter
  `#robin-stamp-ink` aus `<StampDefs />`, einmal in `app/layout.tsx`); **kleiner Text (Ring,
  Zeilen) voll deckend ohne Filter, die Mitte voll deckend mit Filter** – so bleibt jeder Text ≥ 4,5:1. Alles mit `mix-blend-mode: multiply`.
  **Ringtext max. ca. 11 Zeichen oben, 12 unten (Faustregel: ≈ 12), länger → `rect`/`double`**
  (Dev-Warnung in der Konsole).
  `plant` = Pfad zum Pflanzen-PNG der Endstufe, als einfarbiger Abdruck, nie bunt; **immer mit
  `plantName`** (geht ins `aria-label`). Abdruck **`plantPrint="lines"` als Standard**
  (Helligkeits-Schwelle, innere Linien bleiben erhalten; entschieden 2026-11-16),
  `silhouette` (Alpha-Form) nur für helle Pflanzen wie die Pfingstrose, bei denen „lines“ zu
  wenig Tinte lässt. **Langfristig: eigene Strich-Motive pro Pflanze**, zusammen mit den
  Herbarium-Assets anlegen; dann ersetzen sie beide Masken-Varianten. Drehung Standard +4° (im Uhrzeigersinn, entschieden 2026-11-17), max. ±15° (Ausnahme von der
  ±3°-Regel: Stempel sind klein). `animate` = Aufdrücken mit kurzem Wackeln, nur ohne
  reduced-motion. `role="img"` mit `aria-label` aus top, plantName, center, bottom.
  **Ein Stempel steht immer auf Papier, nie direkt auf dem Garten – und nie auf den dunklen
  Rändern von `paper-note.webp`:** dort sinkt der Kontrast von Ring- und Zeilentext (`stamp-rust`
  4,36:1, `stamp-green` 4,32:1 auf `paper-deep`). Er gehört in die Mitte der Fläche, mit Abstand zur
  gerissenen Kante (≥ 18 px, so viel wie der Rand des `PaperPanel`).
- **XP-Anzeige** (D6, entschieden 2026-11-16): **`XpSeedRow` ist der Standard**
  (`components/journal/xp-seed-row.tsx`), `compact` für die Kopfzeile (≤ 2rem hoch, eine Zeile),
  `large` für das Journal (Level und Betrag oben, Furche in voller Breite darunter). Eine
  Tintenfurche mit 10 flachen Pflanzgruben (compact flacher und mit mehr Abstand); **jedes volle
  Zehntel des Levels = ein Samen** (`public/ui/seed.webp`, ≈ 0,8 × Grube, liegt am Grubenboden,
  Rand bleibt sichtbar). **Das angefangene Zehntel zeigt im nächsten Loch einen halb vergrabenen
  Samen in Vierteln (25 / 50 / 75 %)**, damit jede Session etwas verändert; die Erde sinkt dezent
  (nur `transform`). Links „Lv“ (Courier, 13 px) + Levelzahl (Fraunces 600), rechts ein Keimling in
  Tinte, bei `large` mit „Lv 9“ in Courier daneben, bei `compact` ohne Zahl; daneben „42 / 70 XP“
  (Fraunces, tabular-nums, Tinte – nie Kupfer). Ein neuer Samen fällt mit kleinem Bounce ins Loch
  (ein angefangener wird ohne Fall voll), nur ohne reduced-motion; beim ersten Rendern fällt
  nichts. **Schmale Zeile (compact, Container-Query):** „/ 70“ ausblenden, **„42 XP“ bleibt als
  letzte Stufe**; Samen ≈ 10 px erst ab ca. 24em Zeilenbreite, darunter werden sie kleiner. Die
  Zahlen bleiben in `aria-valuetext`. **Samen** mit `multiply` und feiner `xp-deep`-Kontur
  (Aquarell allein nur 2,85:1), geladen mit `loading="eager"` + `unoptimized`.
  **`XpSeedJar`** (`xp-seed-jar.tsx`) **nur in einer Größe (Glas 9rem) für die Journal-Seite**,
  nie in der Kopfzeile: `seed-jar.webp` (Glas mit Korken und Anhänger), Samen als Muster mit
  `multiply` auf die Innenform begrenzt, die Oberkante steigt mit ease-out (nur `transform`),
  „Lv“ über der Levelzahl zweizeilig auf dem gemalten Anhänger; wegen des Korkens fällt kein
  Samen hinein. Für beide: steht immer direkt auf Papier (kein eigener Zettel, nie auf dem
  Garten); `role="progressbar"`, `aria-label` nur „Level 8“, Zahlen über `aria-valuetext`;
  `value`/`max` per `Number.isFinite` abgesichert; Größen in rem/em; Zähler als eigene
  Kindkomponente (`XpAmount` in `xp-shared.tsx`) mit derselben ease-out-Kurve wie die Füllung.
  **Wenn `level` sich ändert: keine Rückwärts-Animation, sofort der neue Zustand** (Furche,
  Glasfüllung und Zähler werden per `key` neu aufgebaut). Level-up gehört nicht in diese Bausteine
  (eigener Moment). Das Lineal (`XpRuler`) wurde verworfen.
- **Kopfzeile = Journal-Rahmen** (entschieden 2026-11-17, `components/nav-bar.tsx`): ein
  Papierstreifen (Papierfarbe + `paper-texture.webp`, `--shadow-paper`), unten eine gezeichnete
  Tintenkante (`InkRule`) – nie Weiß, Glas oder Blur. Links Brand, Münze (`GameIcon coin` +
  `AnimatedCounter`) und `XpSeedRow compact`; rechts die Bänder. **Das Level steckt in der
  Saatreihe („Lv 8“), es gibt keine zweite Level-Anzeige.** Das `Bookmark`-Link ist genau so hoch
  wie die Zeile (das ist Klickfläche und die Höhe, die Garden/Studyroom über `--garden-top` /
  `--studyroom-top` messen); nur das hängende Bandende ragt über den Inhalt, nur als Deko
  (`pointer-events: none`). **Mobil (unter 55rem):** zwei Zeilen – Brand klein, Münze,
  Saatreihe; darunter die Bänder nur als Icon (44 × 44 px), das aktive mit Label (unter 22rem
  auch das nur als Icon). Kein seitliches Scrollen bis 320 px.
- **`XpSeedRow compact` unter 30rem Breite: 5 statt 10 Löcher** (je 20 %); der angefangene Samen
  bleibt (Viertel-Schritte im nächsten Loch).
- **Level-up-Übergang** (`components/level-up-note.tsx`, bis der große Moment kommt): eine
  `RobinNote` (`surface="slip"`, `mood="happy"`) „Level 9! New seeds are waiting.“ rechts unter
  den Bändern, nur wenn das Level in diesem Tab steigt; weg nach 7 s (pausiert bei Hover), per
  Klick oder Escape; `role="status"` / `aria-live="polite"`. Dev-Trigger: „Next level“ im
  XP-Demo auf `/dev/components`.
- Drehungen klein halten (±1–3°), damit es lebendig wirkt, nicht chaotisch. **Breite Panels
  höchstens 1°** (bei 1000 px Breite hebt 3° eine Ecke schon um gut 50 px an); stärkere Drehung
  nur für kleine Zettel (Notiz, Etikett, Foto).
- **Drehung im Verbund** (entschieden 2026-11-17, Audit nach D8): **höchstens ein gekipptes
  Element pro Panel, zusätzlich zum Panel selbst** (z. B. ein Stempel *oder* ein gekipptes
  Etikett, nicht beides). **Richtungen abwechseln:** kippt das Panel gegen den Uhrzeigersinn,
  kippt das Element darin mit dem Uhrzeigersinn (Drehungen addieren sich sonst, −1,5° Panel +
  −6° Stempel = −7,5°). Klebeband zählt nicht als gekipptes Element. Standardwerte sind klein und
  gemischt: Stamp +4°, RobinNote-Zettel +1° mit Klebeband −2°, Signatur −3°, Klebeband oben am
  PaperPanel −2°, ChoiceGroup-Ellipse +1,5°, Slider-Griff Kiesel +4° / Tintenklecks −8°;
  `PaperPanel` und `Label` ohne `tilt` stehen gerade.
- **Ausnahme Sammelfläche (Journal, rechte Seite; entschieden 2026-11-17):** Wo Dinge wie in
  ein Album geklebt sind – Briefmarken als Reihe, Wochen-Stempel als eigene Reihe –, dürfen
  mehrere Elemente gekippt sein: **klein (bis ±2°) und abwechselnd** (z. B. +1,5 / −1 / +2 / −1,5).
  Wochen-Stempel überlappen einander nur leicht (≈ 1rem am Ring, nie über der Zeit in der Mitte). Gilt nur
  für solche Sammelflächen, nicht für Panels mit Bedienelementen.

---

## 5. Schriftrollen

| Rolle | Variable | Schrift | Wofür |
|---|---|---|---|
| **Display** | `--font-display` | Fraunces 400 / 600 | Überschriften, Fließtext, Buttons, große Zahlen (XP, Coins, Level, **auch der Timer**), Ortsnamen |
| **Etikett** | `--font-label` | Courier Prime 400 | **Nur kleine Etiketten und Metadaten**: Daten, Kategorien, Stempeltexte, Preise auf Steckschildern. **Mindestens 13 px.** |
| **Handschrift** | `--font-hand` | Caveat 500 | **Nur Robins Stimme**, **höchstens eine Notiz pro Screen** |

Festgelegt am 2026-11-14, app-weit eingebunden seit 2026-11-17. Einbindung über `next/font/google` in `app/fonts.ts` (Root-Layout), nur die genannten Schnitte; die Rollen-Variablen (`--font-display`, `--font-body` = Fraunces, `--font-label`, `--font-hand`) werden auf `body` in `globals.css` gemappt. Probe auf `/dev/components` (Fonts). Fließtext-Gewicht 400, alles Fette 600 (Fraunces ist nur in 400/600 geladen; 700+ würde synthetisch fett).

Regeln:
- Handschrift **nie** für Bedienelemente (Buttons, Navigation, Formularfelder), Preise oder wichtige Zahlen.
- Höchstens **eine** Robin-Notiz pro Screen.
- Große Zahlen immer in Fraunces, auch der Timer. Courier Prime nie für große Zahlen.
- Courier Prime nie unter 13 px.
- Kein Fredoka/Baloo/Quicksand, keine System-/Inter-Schrift als Hauptschrift. Ersatzschrift im Stack: `Georgia, serif`.
- Keine Großbuchstaben-Labels mit Sperrung. Hervorhebung über Etikett, Gewicht oder Unterstreichung.
- **Zählende Zahlen (Timer, Coins, XP, Level) immer in `TabularNumber`** (`components/journal/tabular-number.tsx`, 2026-11-17): Fraunces hat keine tabellarischen Ziffern (`tabular-nums` bewirkt nichts, „1“ ist rund ein Drittel schmaler als „0“). Der Baustein setzt jede Ziffer in ein Feld fester Breite (0.62em, mittig), `: , . /` schmaler (0.3em), Leerzeichen 0.25em; Schrift, Größe, Farbe erbt er. Screenreader bekommen den Klartext. `AnimatedCounter` nutzt ihn bereits. Reine Zahlen, die sich nie ändern (Preise, Datumsangaben), brauchen ihn nicht.
- Fließtext mindestens 16px; Handschrift eher größer setzen (sie läuft optisch klein).

---

## 6. Farben

Tokens liegen in `app/bloomly-theme.css` (`@theme`). Bestehende Botanical-Warm-Palette bleibt;
neue Tokens (Papier, Tinte, Klebeband, Stempelfarben) werden dort ergänzt, nicht inline gesetzt.

| Token | Wert | Rolle |
|---|---|---|
| `canvas` | `#FBF7EF` | App-Hintergrund, Papier-Grundton |
| `ink` | `#3B3A36` | Text, Tinte (nie reines Schwarz) |
| `ink-soft` | `#7A756B` | Sekundärtext, Bleistift |
| `primary` | `#4CA65A` | Wachstum, aktive Navigation, Fortschritt, Garten-Stempel |
| `primary-deep` | `#3B8248` | Weißer Text darauf (4,70:1); Markenfarbe der Kopfzeile. Der Primär-Button ist ein Holzschild (siehe 4). |
| `primary-ink` | `#2F6B3A` | Grüner Text auf hellen Flächen |
| `coin` | `#F2B33D` | Coins (Gold) |
| `xp` | `#C77B3C` | XP (Kupfer) |
| `accent-gold` | `#C9A227` | **Nur seltene Momente**: Streak-Meilenstein (7/30/100), Signature-Items, später Premium |

**Journal-Material (B2, angelegt am 2026-11-14, in der App noch nicht verwendet):**

| Token | Wert | Rolle |
|---|---|---|
| `paper` | `#F7F0E1` | Papier-Grundton, hebt sich leicht vom Canvas ab |
| `paper-deep` | `#EEE3CC` | Dunklere Papierlage, gealterte Kanten, Rückseiten |
| `paper-line` | `#DED0B4` | Linien und Falz auf Papier (nur dekorativ, nie für Text) |
| `ink-muted` | `#69645A` | Gedämpfte Tinte auf Papier (5,18:1 auf paper, 4,62:1 auf paper-deep) |
| `tape-1` | `rgba(236, 214, 158, 0.65)` | Klebeband Honig/Pergament |
| `tape-2` | `rgba(184, 204, 176, 0.6)` | Klebeband Salbei |
| `stamp-green` | `#4A7250` | Garden-Stempel: Primary-Farbton, verblasst (4,85:1 auf paper) |
| `stamp-rust` | `#A4503A` | Rostrot für Daten/Stempel (4,89:1 auf paper) |
| `stamp-blue` | `#3E5A7E` | Tintenblau (6,23:1 auf paper); Füllertinte für Robins Stimme (`RobinNote`) |
| `wood-ink` | `#36200F` | Eingebrannte Schrift auf dem Holzschild-Button (≥ 4,6:1 auch auf der dunkelsten Maserung, im Mittel 7,2:1) |
| `--filter-label` / `--filter-wood` / `--filter-wood-lift` / `--filter-wood-press` / `--filter-wood-faint` / `--filter-pebble` | `drop-shadow(…)` in `rgba(92,64,32,…)` | Warme Schatten für einzelne Gegenstände (Etikett, Holzschild in Ruhe / angehoben / gedrückt / deaktiviert, Kiesel). Immer per `filter`, folgt der Kante. Liegen in `:root`; keine eigenen `drop-shadow`-Werte in Bausteinen. |
| `--shadow-paper` | `0 1px 1px rgba(92,64,32,.1), 0 6px 16px -6px rgba(92,64,32,.28)` | Einziger Papierschatten, warm statt grau (liegt in `:root`, nicht in `@theme`). Für Flächen mit gerader Kante. |
| `--ink-fine` / `--ink-line` / `--ink-stroke` | `1px` / `1.5px` / `2.25px` | Die drei Strichstärken für gezeichnete Tinte (siehe §4). Liegen in `:root`. |
| `--filter-paper` | `drop-shadow(0 1px 1px rgba(92,64,32,.1)) drop-shadow(0 2px 3px rgba(60,40,20,.22)) drop-shadow(0 5px 6px rgba(92,64,32,.2))` | Derselbe Schatten für Papier-Assets mit gerissener Kante (`PaperPanel`), folgt dem Rand. `drop-shadow` kennt keinen Spread, daher eine kleinere weiche Ebene plus eine engere, dunklere, damit das Papier auch auf dem Garten Tiefe behält. Liegt in `:root`; nur auf ein `::before` hinter dem Inhalt setzen. |

Regeln:
- Weißer Text nur auf `primary-deep` (4,70:1), **nicht** auf `primary` (3,04:1).
- **`ink-soft` nie für Text, immer `ink-muted`** (in der App seit 2026-11-17 durchgängig umgestellt). `ink-soft` hat auf Papier nur 4,04:1 (auf Canvas 4,29:1) und reicht nicht für Text; es bleibt nur für Linien, Bleistift und Icons.
- Coin und XP erscheinen oft nebeneinander und müssen immer unterscheidbar sein – Farbe **und** Icon.
- Gold nie für CTAs oder Alltags-UI. Wenn Gold häufig auftaucht, verliert es seine Bedeutung.
- Pro Ort eine Akzentfarbe aus der Landschaft (Garten = Grün, Beach = Türkis/Sand, Berge =
  Steingrau/Kiefer …), über `--color-world-*` und `data-world`. Journal-Ebene bleibt neutral.
- Text nie direkt auf Illustration – immer auf Papier/Etikett. Kontrast mind. 4,5:1 für Text.

---

## 7. Verbotsliste

Jeden Screen vor dem Commit dagegen prüfen.

| Verboten | Stattdessen |
|---|---|
| Großbuchstaben-Labels mit Sperrung | `Label` (Etikett, Schreibmaschine) |
| Weiße Karten mit Schatten | `PaperPanel` (Papier, optional Klebeband) |
| Pills als Navigation | Lesezeichen-Bänder |
| Glassmorphism (Blur, halbtransparente Panels) | Papier oder Holzrahmen |
| Verschwommene Farbkleckse im Hintergrund | Papiertextur / Material des Ortes |
| Standard-Icons (Lucide u. ä.) | Eigene Icons im Asset-Stil |
| Generisches Produkt-Grid im Shop | Samentüten am Regal |

Außerdem: kein SaaS-Dashboard-Look, kein Fotorealismus, kein kindisches Comic-Overload (zu viel
Konfetti/Sterne gleichzeitig).

---

## 8. Bewegung & Animation

- **Belohnung laut, Lernen ruhig.** XP, Coins, Level-Up, Wachstum, „First bloom!“ sind die lauten
  Momente; Timer, Formulare, Navigation bleiben still.
- **Nie lineares Easing.** Organisch, leicht überschwingend (`[0.34, 1.56, 0.64, 1]` oder Springs).
- **Ein orchestrierter Moment schlägt viele kleine:** Robin erscheint → +XP zählt hoch → Coins
  fliegen → Streak pulsiert. Sequenz über `delayChildren`/`staggerChildren`.
- Material bewegt sich wie Material: Zettel wird angeklebt, Stempel wird gedrückt (kurz runter,
  leichtes Wackeln), Blüte wird ins Herbarium geklebt, Samentüte wird vom Regal genommen.
- Nur `transform` und `opacity` animieren.
- **Ein Bewegungsmuster für alle Bausteine** (entschieden 2026-11-17): Animationen und
  Übergänge stehen **nur** in `@media (prefers-reduced-motion: no-preference) { … }`, nie als
  Standard mit `reduce`-Abschaltung. Wer nichts angibt oder `reduce` wählt, sieht sofort den
  Endzustand. (Zähler in JS prüfen `reduce` und springen auf den Endwert.)
- **`prefers-reduced-motion` immer respektieren** – vollständiger Fallback ohne Bewegung,
  Zahlen springen dann direkt auf den Endwert.

**Zähler, der hochzählt statt springt:**
```jsx
function AnimatedCounter({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="tabular-nums">{display}</span>;
}
```

**Coins fliegen zum Zähler (Framer Motion):**
```jsx
<motion.div
  initial={{ x: startX, y: startY, scale: 1, opacity: 1 }}
  animate={{ x: targetX, y: targetY, scale: 0.4, opacity: 0 }}
  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
  onAnimationComplete={() => incrementCoinCounter(amount)}
/>
```

**Level-Up als Sequenz:**
```jsx
<motion.div
  initial={{ scale: 0.6, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 260, damping: 18 }}
>
  {/* Robin kommt rein → neue Levelzahl als Stempel → ggf. neue Briefmarke */}
</motion.div>
```

**Button = Gegenstand** (`components/journal/button.tsx`): Das Holzschild hebt sich beim Hover
minimal an, beim Drücken sinkt es leicht ein. Den größeren Schatten blendet eine zweite Schicht per
`opacity` ein, damit nur `transform` und `opacity` animiert werden:
```css
.primary:hover { transform: translateY(-1px); }        /* nur ohne reduced-motion */
.primary:hover .woodLift { opacity: 1; }               /* größerer warmer drop-shadow */
.primary:active { transform: translateY(1px); }
.primary:active .woodLift { opacity: 0; }
```

**Pflanzenwachstum:** diskrete Stufen aus `growth_percent` (`v_garden_objects_with_progress`),
keine Skalierung eines Einzelbilds. Stufenwechsel als Crossfade (`opacity`, ~400 ms).

**Garden-Drop:** beim Loslassen kurzer Overshoot `scale` 1 → 1.05 → 1 (~300 ms).

---

## 9. Ökonomie-Referenz

Quelle: `bloomly-schema.sql` und `bloomly-v1-economy-decisions.md` (bei Unsicherheit dort
nachschlagen, nicht schätzen; das Schema hinkt den Migrationen evtl. hinterher).

- **XP = 2 × Coins** pro Session, immer exakt. Beide bei Session-Ende gemeinsam zeigen.
- **Streak-Tag zählt ab 15 kumulierten Lernminuten/Tag.** Wenn sinnvoll anzeigen, wie viel fehlt.
- **Level wird nie gespeichert**, immer aus XP berechnet (`get_level()`). In der UI nie lokal
  vorberechnen oder cachen – Server-Antwort übernehmen.
- **Orte schalten frei bei Level** 1 (The Garden), 10 (Beach), 20 (Mountains), 30 (Desert),
  40 (Arctic), 50 (Jungle), 60 (Japanese Garden), 70 (Fantasy).
- Aktuell gibt es nur „The Garden“. Weitere Orte erscheinen als „Not yet issued“.

---

## 10. Sprache & Robins Stimme

- **Alle UI-Texte auf Englisch** – auch Item-Namen (keine „Naturstein“, „Steinweg“ etc.).
- Robins Stimme (`RobinNote`, Handschrift): kurz, freundlich, wie eine Notiz im Gartentagebuch.
  Beispiele: „Nothing planted yet. Shall we start with a seed?“, „First bloom! Pressed it for you.“
- Leerzustände immer mit `RobinNote` (signiert „— R.“), nie nur „No data“. Mini-Robin als Bild nur bei besonderen Momenten.
- Bedienelemente sprechen neutral und klar („Start session“, „Buy“, „Save“) – Robin spricht in
  Notizen, nicht auf Buttons.
- Screen-Namen exakt so: Studyroom, Garden, Nursery, Journal, Herbarium, Settings.

---

## 11. Checkliste vor jedem UI-Commit

- [ ] Zu welcher Ebene gehört der Screen/Baustein – und trägt er das passende Material?
- [ ] Nichts aus der Verbotsliste (Abschnitt 7) vorhanden?
- [ ] Nur bestehende Bausteine verwendet, keine neue Kartenvariante erfunden?
- [ ] Handschrift ausschließlich für Robins Stimme, höchstens eine Notiz pro Screen? Courier Prime ≥ 13 px?
- [ ] Farben nur über Tokens; Gold nur für seltene Momente; Coin/XP unterscheidbar?
- [ ] Alle Texte englisch, Screen-Namen korrekt?
- [ ] Belohnungsmoment orchestriert statt zusammengewürfelt?
- [ ] Funktioniert mit `prefers-reduced-motion: reduce` und Tastatur; Kontrast ≥ 4,5:1?
- [ ] Tinte gezeichnet (`InkRule`/`InkFrame`), nur `--ink-fine`/`-line`/`-stroke`, Fokus = `FocusFrame`?
- [ ] Höchstens ein gekipptes Element pro Panel, Richtung gegen die des Panels?
- [ ] XP/Coins/Level stimmen mit der Ökonomie-Referenz überein?
- [ ] Passt es zum Leitsatz: „Du lernst, ihr pflanzt, das Journal erinnert sich“?
