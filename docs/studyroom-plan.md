# Studyroom neu bauen – Plan (Phase 5)

**Stand 2026-11-18: alle neun Schritte umgesetzt** (Commits auf `feature/studyroom`). Die Reihenfolge von 6 und 7 wich ab: erst die kompakten Ambience-Slider, dann Place als `ChoiceGroup` mit Speichern; `ChoiceGroup` kannte deaktivierte Optionen schon und brauchte keine Erweiterung.

Quellen: Skill `robin-design`, `docs/robin-field-study-konzept.md` (Phase 5),
`docs/migration-inventory.md` (Studyroom). Ebene: **Ort** (Garten-Welt, Material Holz) oben,
**Journal** (Papier, Klebeband) unten. Der Studyroom ist Robins Arbeitstisch im Garten.

## Entschieden (2026-11-17)

1. **Welt-Auswahl** steht im Sounds-Zettel; der Zettel heißt **„Ambience“** (Sounds + Place).
2. **`ChoiceGroup`** wird um deaktivierte Optionen mit Hinweis erweitert (z. B. „Beach · Lv 10“).
3. **RobinNote im Complete-Moment** (`mood="happy"`, Session-Notiz).
4. **Zitat bleibt:** während der **Pause** als `RobinNote` (kurzes Zitat), beim Abschluss die
   Session-Notiz. **Eine Notiz pro Zustand**, nie zwei gleichzeitig. Im Idle und im Fokus keine Notiz.
5. **„Next up“** bleibt, als `Label`.
6. **Timer-Zettel wird während des Laufs kompakter** (Zeit, Pause, Stop; Modus und Eingaben weg).
7. **Fullscreen:** kleines Papier-Etikett mit der Zeit plus die Fortschrittsschiene.
8. **Sounds vorerst nur Text-Labels** (keine Inline-Icons) mit `Slider`.
9. **Welt-Auswahl wird gespeichert** in `study_room_settings.background_world_id` (existiert im
   Schema). Gesperrte Welten sind nicht wählbar. Die Bühne zeigt die gewählte Welt, sobald es
   mehr als einen Garten gibt; bis dahin ist nur „Garden“ wählbar.

## Aufbau

**Desktop (ab 1100 px, kein Seitenscroll):** oben der Garten (nichts darüber außer der
Fortschrittsschiene an der Unterkante und dem Fullscreen-Chip), darunter drei Zettel mit
Klebeband: Timer (am breitesten), To-do, Ambience.

**Mobil (< 1100 px, bis 320 px ohne Seitscroll):** Garten ca. 45–50 dvh ohne Overlay, darunter
Timer, To-do, Ambience; ab ca. 700 px zwei Spalten. Start/Pause ohne Scrollen erreichbar.

Das Glasfenster mit Countdown entfällt; der Countdown (`TabularNumber`) lebt im Timer-Zettel.

## Was ersetzt wird

| Alt | Neu |
|---|---|
| `.toolCard` (weiße Karte) | `PaperPanel` mit Klebeband |
| `.stageWindow` (Glas) | entfällt, Countdown im Timer-Zettel |
| `.modePills` | `ChoiceGroup` (25/5, 50/10, Flexible) |
| `.miniInput` | `TextInput` |
| `Button` (alt) | `journal/Button`: Start = `primary` (Holzschild), Pause = `secondary`, Stop = `quiet` |
| `variant="tonal"` | `secondary` |
| `.todoCheckbox`, `.todoInput` | `Checkbox strike`, `TextInput` |
| `.soundSlider` | `Slider` (Griff `pebble`) |
| `.worldOption` (Pills) | `ChoiceGroup` mit deaktivierten Optionen |
| `.phaseLabel`, `.statLabel` | `Label` |
| `SessionProgressBar` (Glas) | Papierschiene mit Tinten-Furche, Pause unterscheidbar |
| `.rewardCard`, `.completeCard`, `.statTile` | `PaperPanel`, `Label`, `GameIcon` |
| `.fullscreenButton`, `.stageNotice`, `.iconButton` | Papier-Chip / quiet Button |
| `CoinIcon`, `XpIcon` | `GameIcon` |
| Inline-SVG-Icons (Timer, Todo, Sounds, …) | entfallen; Überschriften als `Label` |
| `ink-soft` als Textfarbe | `ink-muted` |

## Schritte (jeder ein Commit)

1. **Extraktion** nach `components/studyroom/`, ohne sichtbare Änderung (Vorher/Nachher-Screenshot).
2. **Skelett:** Glasfenster raus, Countdown in den Timer-Bereich, Zettel als `PaperPanel` mit Tape,
   Desktop- und Mobil-Layout, `Label`, `ink-muted`.
3. **Timer-Zettel:** `ChoiceGroup`, `TextInput`, Buttons, Phase und „Next up“ als `Label`,
   Coin/XP mit `GameIcon`, kompakter Zustand während des Laufs.
4. **Fortschrittsschiene** im neuen Material; Fullscreen-Etikett mit Zeit.
5. **To-do-Zettel:** `Checkbox strike`, `TextInput`, Add/Delete.
6. **`ChoiceGroup`:** deaktivierte Optionen mit Hinweis (inkl. `/dev/components`, `docs/ROBIN.md`).
7. **Ambience-Zettel:** `Slider` mit Text-Labels, Welt-Auswahl per `ChoiceGroup`,
   Speichern in `study_room_settings.background_world_id`.
8. **Pause und Complete:** Zitat als `RobinNote` in der Pause; Reward und Complete auf Papier,
   Session-Notiz (`mood="happy"`) beim Abschluss.
9. **Aufräumen und Doku:** tote CSS und alte Icons löschen, ungenutzte Alt-Komponenten
   (`components/button`, `coin-icon`, `xp-icon`, `lock-icon`) prüfen und entfernen, Konzept,
   `docs/ROBIN.md`, Migration-Inventory und Screenshots aktualisieren.

Prüfung je Schritt: 1440 / 1100 / 768 / 375 / 320 px; idle, läuft, Pause, Complete; Tastatur und
Fokus, `prefers-reduced-motion`, Kontrast ≥ 4,5:1; Verbotsliste und Checkliste aus dem Skill.

## Offen

- Schritt 7: Wie die Bühne die gewählte Welt rendert, solange nur „Garden“ existiert (vermutlich
  nur speichern und anzeigen). Beim Bau klären.
