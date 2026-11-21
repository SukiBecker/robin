# Robin – Garden Journal

Robin ist eine gamifizierte Lern-App für Studierende: Fokuszeit im Pomodoro-Stil wird
zu XP und Coins, die in einen persönlichen Garten fließen. Man kauft Samen und Deko in
der Gärtnerei (Nursery), pflanzt sie in den Garten und hält den Fortschritt in einem
Tagebuch (Journal) fest. Maskottchen ist Robin, ein Rotkehlchen und reisender Gärtner.

Das Produktkonzept steht in [PRODUCT.md](PRODUCT.md), das Designsystem in
[DESIGN.md](DESIGN.md), alle Produkt- und Ökonomie-Entscheidungen in [docs/ROBIN.md](docs/ROBIN.md).

![Bausteine des Journal-Designs](docs/screenshots/building-blocks.png)

## Tech Stack

| Bereich   | Technik                                                                      |
| --------- | ---------------------------------------------------------------------------- |
| Frontend  | Next.js 15 (App Router), React 19, TypeScript                                |
| Styling   | CSS Modules, Tailwind CSS 4 (nur für Design-Tokens in `app/robin-theme.css`) |
| Animation | Motion (`motion/react`) und CSS                                              |
| Backend   | Supabase: Postgres, Auth, Row Level Security, SQL-Funktionen (RPC)           |
| Auth      | `@supabase/ssr` (Cookie-Session), Gating in der Next.js-Middleware           |
| Qualität  | ESLint, Prettier, `node --test` für die reine Logik in `lib/`                |

## Projektstruktur

```
app/                  Routen (App Router) und Design-Tokens
  studyroom/          Fokus-Timer, Todos, Belohnung
  garden/             Garten: Kamera, Platzieren, Verschieben, Inventar
  nursery/            Gärtnerei: Weltübersicht und Regal pro Welt
  journal/            Tagebuch: Wochen, Kalender, Weltstempel
  signin/ signup/ reset-password/ settings/
  dev/                Playground für die Bausteine (in Produktion 404)
components/           UI-Bausteine; journal/ enthält das Papier-Designsystem
lib/                  Logik ohne UI: garden/, journal/, shop/, auth/, supabase/ ...
middleware.ts         Session-Refresh und Zugriffsschutz
supabase/             Supabase-CLI-Konfiguration
db/, sql/             Schema-Dump und SQL-Änderungen (siehe Datenmodell)
docs/                 Konzept, Entscheidungen, Zielstruktur
```

Eine Notiz zur geplanten Aufräum-Phase der Ordner steht in
[docs/zielstruktur.md](docs/zielstruktur.md).

## Lokales Setup

Voraussetzungen: Node.js 20+ und ein Supabase-Projekt.

```bash
npm install
cp .env.example .env.local   # URL und anon Key des Supabase-Projekts eintragen
npm run dev                  # http://localhost:3000
```

Das Schema liegt als Dump in `db/dev-schema-dump.sql`, die Katalogdaten (Items, Welten,
Level, Quests) in `db/dev-content-dump.sql`. Beide werden im SQL-Editor des Supabase-Projekts
ausgeführt, danach die Skripte aus `sql/` in zeitlicher Reihenfolge.

| Befehl            | Zweck                                         |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Entwicklungsserver                            |
| `npm run build`   | Produktions-Build (inkl. Typ- und Lint-Check) |
| `npm run lint`    | ESLint                                        |
| `npm test`        | Unit-Tests der Logik in `lib/`                |
| `npm run format`  | Prettier                                      |
| `npm run db:dump` | Schema- und Katalog-Dump aus dem Dev-Projekt  |

## Architektur

**Die Datenbank ist die Quelle der Wahrheit.** Der Client hält keine Spielregeln:
alles, was Wert hat, passiert in Postgres-Funktionen, die der Client per RPC aufruft.

- **Belohnungen serverseitig.** `complete_study_session` berechnet aus der echten
  Wanduhrzeit abzüglich Pausen, was belohnt wird (pro voller Minute 1 Coin und 2 XP).
  Der Client schickt keine Dauer, sondern nur die Session-ID. Eine offene Pause wird
  serverseitig geschlossen, nie belohnt.
- **Lückenlose Buchführung.** Jede Gutschrift läuft über `_grant_reward` und wird in
  `reward_transactions` protokolliert. XP, Coins und Streak in `profiles` sind nur ein
  Zustands-Cache dieses Protokolls.
- **Geschützte Felder.** Ein Trigger (`protect_profile_fields`) verbietet Clients, XP,
  Coins und Streak direkt zu schreiben. Nur `SECURITY DEFINER`-Funktionen dürfen das.
- **Level wird berechnet, nicht gespeichert.** `get_level()` leitet das Level aus
  `level_thresholds` ab, die View `profiles_with_level` stellt es bereit.
- **Käufe ohne Race Conditions.** `purchase_item` sperrt die Profilzeile (`FOR UPDATE`),
  prüft Level, Besitz und Coins und bucht in einer Transaktion. Einmal-Käufe wie
  Weg-Stile lassen sich nicht doppelt auslösen.
- **Platzieren im Garten.** `place_garden_object` prüft Weltgrenzen und Kollisionen
  (Rechteck-Überlappung) und serialisiert gleichzeitige Platzierungen eines Nutzers mit
  einem Advisory Lock. Pflanzen wachsen mit der abgeschlossenen Lernzeit seit dem
  Pflanzen (`garden_object_growth_seconds`), nicht mit einem Client-Timer.
- **Streak.** `sync_streak` verlängert oder bricht die Serie anhand der Mindest-Lernzeit
  aus `app_config` und verbraucht bei Bedarf einen Streak Freezer.
- **Row Level Security** ist auf allen Tabellen aktiv. Nutzer sehen und ändern nur ihre
  eigenen Zeilen, Kataloge (aktive Items, Welten, Quests, Achievements) sind lesbar.

**Frontend.**

- Die Middleware erneuert die Session bei jeder Anfrage und prüft mit `getUser()` (nicht
  `getSession()`), ob ein gültiger Nutzer vorliegt. Geschützte Seiten bekommen
  `Cache-Control: no-store`, damit nach dem Abmelden nichts aus dem Back/Forward-Cache
  zurückkommt.
- Spielzustand kommt vom Server, der Client zeigt ihn an und animiert Übergänge. Kleine
  Ereigniskanäle (`lib/shop/purchase-events.ts`, `robin:xp-changed`, `robin:streak-synced`)
  verbinden Feedback-Effekte, ohne Props durch die Seite zu reichen.
- Der Garten hat eine eigene Kamera (Zoom, Pan, Rubber Band, Kantenscrollen) in `lib/garden/`,
  getrennt von der Darstellung und mit reinen, testbaren Funktionen.
- Das Designsystem (Papier, Tinte, Stempel, Etiketten) liegt in `components/journal/` und
  ist auf `/dev/components` lokal einsehbar.

## Datenmodell

Kern des Schemas (Schema `public`):

| Tabelle / View                                         | Inhalt                                                     |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `profiles`                                             | Nutzerzustand: XP, Coins, Streak (Cache); View mit Level   |
| `study_sessions`                                       | Fokus-Sessions mit Pausen, Grundlage der Belohnung         |
| `reward_transactions`                                  | Protokoll aller XP- und Coin-Änderungen                    |
| `todos`, `study_room_settings`                         | Aufgaben und Einstellungen des Studyrooms                  |
| `worlds`, `item_catalog`                               | Welten und Katalog (Samen, Deko, Wege) mit Preis und Level |
| `inventory`, `purchases`                               | Besitz und Kaufhistorie                                    |
| `garden_objects`                                       | Platzierte Objekte mit Welt, Position, Rotation            |
| `quests`, `quest_progress`                             | Aufgaben mit Fortschritt                                   |
| `achievements`, `achievement_progress`                 | Erfolge mit Fortschritt                                    |
| `level_thresholds`, `app_config`                       | Balancing: XP pro Level, Streak-Regeln                     |
| `streak_freezer_log`                                   | Einsatz von Streak Freezern                                |
| `v_daily_activity`, `v_weekly_study`, `v_world_stamps` | Auswertungen für das Journal                               |

Bei der Registrierung legt `handle_new_user` Profil und Studyroom-Einstellungen an.

Hinweis zum Stand: Das Schema liegt als Dump (`db/`) mit nachträglichen Änderungen (`sql/`).
Geplant ist, daraus eine Baseline-Migration in `supabase/migrations/` zu machen.

## Lizenz

Privates Portfolio-Projekt, alle Rechte vorbehalten.
