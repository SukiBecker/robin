# Robin – Garden Journal: Design-Konzept & Umsetzungsplan

## Teil 1 – Das Konzept

### Die Geschichte
**Robin ist ein reisender Gärtner. Er zieht von Ort zu Ort und legt dort Gärten an. Du lernst, der Garten wächst, und Robins Journal hält fest, was ihr gemeinsam gepflanzt habt.**

Leitsatz für jede UI-Entscheidung: **„Du lernst, ihr pflanzt, das Journal erinnert sich.“**

Vorbild: die Pflanzenjäger des 19. Jahrhunderts, die mit Samen um die Welt reisten und daraus botanische Gärten anlegten, und das klassische Gartentagebuch (wann gesät, wann geblüht, welche Sorte). Das Journal dokumentiert nichts Gefundenes, sondern **das, was du selbst geschaffen hast**.

### Drei Verben

| Verb | Bedeutung | Wo in der App |
|---|---|---|
| **Wachsen lassen** | Kernloop: lernen, Samen pflanzen, Garten gestalten | Studyroom, Garden |
| **Festhalten** | Das Journal erinnert sich an deine Arbeit | Journal, Herbarium |
| **Weiterreisen** | Progression: neue Orte, neue Samen, neuer Garten | Briefmarken, Stempel, Welt-Freischaltung |

Das Bauen steht im Mittelpunkt, das Journal ist das Gedächtnis, und die Reise ist der Fortschritt.

**Entdecken** heißt in Robin: neue Samen freischalten und eine Pflanze zum ersten Mal wachsen sehen. Jeder Ort bringt regionale Samen mit, die es nur dort gibt.

### Drei Ebenen

| Ebene | Inhalt | Je Welt anders? |
|---|---|---|
| **Reise** | Robin legt an jedem Ort einen Garten an | nie |
| **Journal** | Rahmen um alles: Papier, Tinte, Etiketten, Klebeband, Robins Handschrift, Lesezeichen-Navigation | nie |
| **Ort** | Der Garten, den Robin gerade anlegt (Garten, Strand, Berge …), mit eigenem Material und eigenen Samen | ja |

**Faustregel:**
- Alles, was **über dich** ist (Journal/Statistics, Herbarium, Settings), lebt im Journal und ist weltunabhängig.
- Alles, was **an einem Ort** ist (Garden, Nursery/Shop), trägt das Material des Ortes, in Welt 1 also Holz und Gärtnerei.

### Die Screens

- **Studyroom** ist Robins Arbeitstisch im Garten: oben der Blick auf den Garten, unten Journalzettel mit Klebeband (Timer, To-Do, Sounds) statt weißer Karten.
- **Garden** ist der Garten, den du gerade anlegst. Hier passiert das Bauen.
- **Nursery (bisher Shop)** ist die Gärtnerei vor Ort, bei der Robin seine Samen kauft.
  - Samentüten mit Pflanzenbild, Fantasie-Lateinnamen und Wachstumszeit.
  - Preise stehen auf Steckschildern, gesperrte Items tragen ein Wachssiegel mit Level.
  - Die Tütenrückseite zeigt die 3 Wachstumsstufen.
  - Andere Orte bekommen einen anderen Händler und regionale Samen, das Prinzip bleibt gleich.
- **Journal (bisher Statistics)** ist das Reisekapitel in Robins Gartentagebuch.
  - Wochen-Stempel sind Poststempel des aktuellen Gartens. Das Motiv ist die Pflanze, die du in der Woche am meisten hast wachsen lassen.
  - Jeder angelegte Garten bekommt eine eingeklebte Briefmarke („The Garden · est. Sep 2026“), noch nicht erreichte Orte sind „Not yet issued“.
  - Das nächste Ziel hängt als Gepäckanhänger an der Seite.
  - Im Kalender stehen gepresste Blüten für Lerntage und eine Feder für Freezer-Tage.
- **Herbarium (neu)** ist das Sammelheft deiner eigenen Pflanzen. Jede Pflanzenart, die du zum ersten Mal voll erblühen lässt, wird gepresst eingeklebt, mit Etikett: Name, Datum, Ort, wie lange du dafür gelernt hast („Diese Rose hast du mit 3 Stunden Lernzeit großgezogen“).

### Das Objekt, das alles verbindet

**Samentüte (Nursery) → Pflanze wächst durch Lernzeit (Garden) → gepresste Blüte im Herbarium (Journal)**

### Verbindende Details
- **Ein Material-Set** für alles: Papier, Tinte, Klebeband, Etiketten, Stempel.
- **Derselbe Ortsstempel** erscheint auf Samentüten, Wochen-Stempeln und Herbarium-Etiketten.
- **Robins Handschrift** für Hinweise, Leerzustände und kleine Erfolge, auf jedem Screen.
- **Navigation:** Studyroom · Garden · Nursery · Journal · Settings, als Lesezeichen-Bänder.

### Was wegfällt
- Großbuchstaben-Labels mit Sperrung
- Weiße Karten mit Schatten
- Pills als Navigation
- Glassmorphism
- Verschwommene Farbkleckse im Hintergrund
- Standard-Icons (Lucide)
- Generisches Produkt-Grid im Shop

---

## Teil 2 – Checkliste zur Umsetzung

Arbeitsweise: pro Schritt ein kleiner Claude-Code-Prompt mit genau einem Ergebnis. Den Plan prüfen, bevor er ausgeführt wird. Erst einen Bereich fertig und stimmig machen, dann den nächsten.

### Phase 0 – Entscheidungen festhalten
- [ ] Teil 1 dieses Dokuments in `docs/ROBIN.md` übernehmen (Geschichte, drei Verben, drei Ebenen, Faustregel)
- [ ] `robin-design`-Skill (früher `bloomly-design`) aktualisieren:
  - [ ] Geschichte „reisender Gärtner“ und Leitsatz
  - [ ] Material-Set
  - [ ] Verbotsliste (siehe „Was wegfällt“)
  - [ ] neue Screen-Namen
- [ ] Entscheiden: Navigation umbenennen (Shop → Nursery, Statistics → Journal)?
- [ ] Deutsche Item-Namen auf Englisch umstellen (Naturstein, Steinweg, Garten, Berge)

### Phase 1 – Fundament: Schrift, Farben, Material
- [ ] Schriften festlegen und einbinden:
  - [ ] Display-Serif (z. B. Fraunces)
  - [ ] Handschrift für Robins Notizen (z. B. Caveat)
  - [ ] Schreibmaschine für Etiketten (z. B. Courier Prime)
- [ ] Regel festhalten, wann welche Schrift: Handschrift **nur** für Robins Stimme, nie für Bedienelemente
- [ ] Farb-Tokens in `globals.css` (`@theme`) ergänzen: Papier, Tinte, Klebeband, Stempelfarben (Garten = Grün) – bestehende Botanical-Warm-Palette beibehalten
- [ ] Raster-Assets generieren (gleiche Prompt-Disziplin wie bei den Garten-Assets: kein Fotorealismus):
  - [ ] Papiertextur (kachelbar)
  - [ ] Journal-Doppelseite / Einband
  - [ ] 2–3 Klebestreifen
  - [ ] Etikett-Rahmen
  - [ ] Lesezeichen-Band
- [ ] Assets als 9-Slice vorbereiten, wo sie sich dehnen müssen (Panels, Etiketten)

### Phase 2 – Bausteine (vor jedem Screen)
- [ ] `PaperPanel` (Papier + optionales Klebeband) ersetzt die weiße Karte
- [ ] `Label` (Etikett) ersetzt die Großbuchstaben-Labels
- [ ] `RobinNote` (handschriftliche Notiz, optional mit Mini-Robin)
- [ ] `Stamp` (rund/eckig, Farbe, Text, Pflanzenmotiv, leichte Drehung)
- [ ] `Button`-Stile im neuen Material (primär / sekundär)
- [ ] `XpRuler`: XP-Leiste als Lineal mit Samen-Icon
- [ ] Eigene Icons im Asset-Stil statt Lucide: Coin, XP-Samen, Streak, Freezer-Feder, Navigation
- [ ] Eine Testseite (`/dev/components`) mit allen Bausteinen anlegen und gegen einen Garten-Screenshot prüfen

### Phase 3 – App-Rahmen und Navigation
- [x] Weiße Top-Leiste durch Journal-Rahmen mit Lesezeichen-Navigation ersetzen
- [x] Neue Namen in Routen und Labels übernehmen (falls in Phase 0 entschieden) — `/nursery`, `/journal`, mit Weiterleitung der alten URLs
- [x] Coin- und Level-Anzeige im neuen Stil (z. B. Coin-Dose, Samen-Etikett) — Münze + `XpSeedRow compact`
- [x] Prüfen: Seitenhintergrund ist nirgends mehr Creme mit Farbklecks

### Phase 4 – Journal (Statistics)
- [x] Layout als Journal-Doppelseite — aufgeschlagenes Buch (`JournalSpread`: Einband, Wölbung am Falz, Seitenstapel, Lesebändchen)
- [x] Streak als eingeklebtes Etikett
- [x] Today / Total in den zwei festgelegten Farben, als Handschrift-Unterstreichung
- [x] Kalender: gepresste Blüte = Lerntag, Feder = Freezer; verpasste Tage ohne Zeichen, nur blassere Zahl (geändert 2026-11-17 nach der Critique, vorher Punkt)
- [x] Wochen-Stempel (Datenabfrage: Lernzeit pro Woche + häufigste Pflanze der Woche)
  - Entschieden 2026-11-17: Motiv = Pflanzenart mit der meisten Lernzeit auf wachsenden Objekten der Woche (pro `item_id` summiert), sonst Samen; View `v_weekly_study`. Briefmarken-Datum aus der abgeleiteten View `v_world_stamps`. Today in `stamp-green`, Total in `ink`.
- [x] Briefmarke pro Ort: angelegt = eingeklebt mit „est. <Monat Jahr>“, noch nicht erreicht = „Not yet issued“
- [x] Gepäckanhänger „Next stop“ mit XP bis zum nächsten Ort
- [x] Leerzustand: Robin auf einer leeren Seite mit Bleistiftskizze
  - Offen vor dem Merge: die beiden Views (`sql/journal-world-stamps.sql`, `sql/journal-weekly-study.sql`) in robin-prod ausführen. Ohne sie blendet die Seite Briefmarken und Wochen-Stempel einfach aus.

### Phase 5 – Studyroom
- [ ] Panels unten zu Journalzetteln mit Klebeband umbauen
- [ ] Timer-Panel: Glassmorphism raus, Papier- oder Holzrahmen rein
- [ ] Linearer Fortschrittsbalken an der Unterkante bleibt (bestehende Entscheidung), nur im neuen Material
- [ ] Sound-Slider und Checkboxen im neuen Stil

### Phase 6 – Nursery (Shop)
- [ ] Samentüte als Komponente: Papier-Asset als Rahmen + vorhandenes Pflanzen-PNG (Endstufe) im Fenster
- [ ] Fantasie-Lateinnamen für alle Pflanzen ausdenken und in der DB ergänzen
- [ ] Steckschild für den Preis, Wachssiegel für gesperrte Items
- [ ] Tütenrückseite mit den 3 Wachstumsstufen (Klick/Hover dreht die Tüte)
- [ ] Holzwand/Regal als Material des Gartens
- [ ] Deko und Wege: eigene Darstellung finden (z. B. Holzkiste, Musterplatte) statt flacher Textur-Quadrate
- [ ] Kauf-Moment: Tüte wird abgenommen und wandert ins Inventar

### Phase 7 – Herbarium (neues Feature)
- [ ] Datenmodell entscheiden und ins Schema aufnehmen, z. B. `herbarium_entries` (user, item, `first_bloomed_at`, Lernminuten bis zur Blüte)
  - [ ] Schreiben nur über eine `SECURITY DEFINER`-Funktion (bestehende Konvention)
  - [ ] Auslöser: erste Pflanze einer Art erreicht Stufe 3
- [ ] Gepresste-Blumen-Assets generieren (eine pro Pflanze, flach und leicht verblasst)
- [ ] Herbarium-Seite: Raster aus Einträgen, noch nicht gezogene Pflanzen als Bleistift-Umriss
- [ ] Etikett pro Eintrag: Name, Lateinname, Datum, Ort, Lernzeit, Ortsstempel
- [ ] Sammel-Moment: „First bloom!“, die Blüte wird ins Heft geklebt (Animation)
- [ ] Fortschritt sichtbar machen, z. B. „7 / 14 grown · The Garden“
- [ ] Platz in der Navigation festlegen (eigener Reiter oder Kapitel im Journal)

### Phase 8 – Garden
- [ ] Rasen mit Licht und Variation statt gleichförmigem Rauschen
- [ ] Wege mit Kante und Schatten, passend zum plastischen Asset-Stil
- [ ] Inventar im neuen Stil (Korb / Samentüten)
- [ ] Rand-Vignette und Kamera-Begrenzung (bereits geplant) abschließen

### Phase 9 – Robins Stimme und Feinschliff
- [ ] Alle Leerzustände mit `RobinNote` und Mini-Robin versehen
- [ ] Microcopy durchgehen: kurz, freundlich, wie Notizen in einem Gartentagebuch
- [ ] Settings und Sign-in/Sign-up in den Journal-Rahmen bringen
- [ ] Konsistenz-Check: jeden Screen gegen die Verbotsliste prüfen

### Phase 10 – Testen
- [ ] Studierende testen lassen:
  - [ ] Wird die Geschichte (reisender Gärtner) ohne Erklärung verstanden?
  - [ ] Motiviert das Herbarium?
  - [ ] Welche App nutzen sie bisher, und was nervt sie daran?
- [ ] Erkenntnisse in `docs/ROBIN.md` festhalten
- [ ] Erst danach: zweiter Ort (Beach) mit eigenem Material, Händler und regionalen Samen
