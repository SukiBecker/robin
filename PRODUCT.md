# Product

<!-- impeccable:product-schema 1 -->

> Bei Konflikten zwischen dieser Datei und dem Skill `robin-design` gilt `robin-design`.
> Ausführliche Produkt-, Economy- und Architekturentscheidungen: `docs/ROBIN.md`.

## Platform

web

Desktop zuerst, Smartphone danach (`docs/ROBIN.md` §1).

## Users

Studierende, die ein Fokus-/Lerntool wollen, das sich belohnend und persönlich anfühlt statt klinisch. Ihr Job: konzentrierte Lernzeit (Pomodoro) durchhalten und über Tage hinweg dranbleiben. Motiviert durch einen Sammel- und Gestaltungs-Loop (eigener Garten) plus klare extrinsische Belohnungen (XP, Coins, Level, Streak).

## Product Purpose

Robin ist eine gamifizierte Lern-App. Geschichte: Robin ist ein reisender Gärtner, der an jedem Ort einen Garten anlegt. Du lernst, der Garten wächst, Robins Journal hält fest, was ihr gemeinsam gepflanzt habt.

Leitsatz: **"You learn, you plant together, the Journal remembers."**

Erfolg heißt: Lernzeit wird sichtbar zu etwas Eigenem — ein Garten, der wächst, und ein Journal, das die gemeinsame Geschichte festhält.

## Positioning

Lernzeit wird nicht als Dashboard-Statistik gezählt, sondern als gemeinsame Reise mit Robin erzählt: Jede Session pflanzt etwas in einen Garten an einem konkreten Ort, und Robins Journal ist das bleibende Zeugnis davon. Zwei Nutzer auf gleichem Level sollen völlig unterschiedlich aussehende Gärten haben können.

## Operating Context

Kern-Loop: **Studyroom → Reward Engine → Garden → Shop (Nursery) → zurück in den Studyroom.**

- **Studyroom:** Pomodoro-Timer (25/5, 50/10, flexibel) mit dem eigenen Live-Garten als Hintergrund; die UI tritt während des Timers zurück.
- **Garden:** der aktuelle Garten am aktuellen Ort, platzierbare und wachsende Objekte.
- **Nursery (Shop):** Kauf von Pflanzen/Objekten mit Coins, pro Welt.
- **Journal (Statistics):** "Your study journey", Day-Streak-Kalender, Tageszusammenfassungen.
- **Herbarium**, **Settings**, Sign-in/Sign-up, Landingpage für ausgeloggte User.

### Drei Ebenen der Welt

- **Reise:** ändert sich nie.
- **Journal:** Rahmen um alles — Papier, Tinte, Etiketten, Klebeband, Stempel, Robins Handschrift. Weltunabhängig.
- **Ort:** der aktuelle Garten mit eigenem Material (Welt 1: Holz, Gärtnerei).

**Faustregel:** Alles über dich (Journal, Herbarium, Settings) lebt im Journal. Alles an einem Ort (Garden, Nursery) trägt das Material des Ortes.

## Capabilities and Constraints

- Stack (bestehend): Next.js 15, React 19, Tailwind 4 + CSS Modules, `motion`, Supabase (Auth, Postgres, RLS).
- Belohnungen werden ausschließlich serverseitig berechnet (`complete_study_session()`); Client übergibt nur eine Session-ID. 2 XP und 1 Coin pro volle Minute; Level wird immer aus XP abgeleitet, nie gespeichert.
- Weitere Welten (z. B. Beach, Mountains) werden über Level freigeschaltet; in V1 existiert nur eine Welt.
- **Alle UI-Texte auf Englisch.**
- Terminologie: Studyroom, Garden, Nursery (Shop), Journal (Statistics), Herbarium, Settings, XP, Coins, Level, Day streak.

## Brand Commitments

- Name **Robin** (ehemals Bloomly); Maskottchen Robin, ein Rotkehlchen und reisender Gärtner, mit Stimmungsvarianten (happy, neutral, sad).
- Verbindliches Design-System: Skill `robin-design` (hat Vorrang).
- Vom User verbindlich ausgeschlossen:
  - Großbuchstaben-Labels mit Sperrung
  - weiße Karten mit Schatten
  - Pills als Navigation
  - Glassmorphism
  - verschwommene Farbkleckse im Hintergrund
  - Standard-Icons (Lucide)
  - generisches Produkt-Grid
- Anti-Ziel aus `docs/ROBIN.md`: nie kindisch, nie generisches Flat-Design, nie SaaS-Dashboard mit grünem Akzent.

## Evidence on Hand

- Illustrierte Assets in `docs/` und `public/`: Robin-Posen, Pflanzen in Wachstumsstufen (Rose, Tulpe, Lavendel, Pfingstrose, Daisy, Sonnenblume), Hecken, Büsche, Bänke, Laterne, Brunnen, Pavillon, Steinweg, Saatgut-Tüte, Münze, XP- und Streak-Grafik.
- Konzepte: `docs/robin-field-study-konzept.md`, `docs/checkliste-bausteine.md`, `docs/auth-copy.md`.
- Keine echten Testimonials, Nutzerzahlen oder Pressestimmen vorhanden — nicht erfinden.

## Product Principles

1. **Lernen ist Pflanzen.** Jede Belohnung muss sich als etwas Gewachsenes anfühlen, nicht als abstrakte Zahl.
2. **Das Journal erinnert.** Alles, was den Nutzer betrifft, wird als Robins Aufzeichnung erzählt, nicht als Report.
3. **Der Ort hat Material.** Was an einem Ort passiert, gehört sichtbar zu diesem Ort; die Reise selbst bleibt konstant.
4. **Fokus vor Ornament.** Während des Lernens tritt die UI zurück, der Garten bleibt im Mittelpunkt.
5. **Transparente Belohnung.** Einfache, nachvollziehbare Ökonomie, serverseitig fälschungssicher.
