# Bestandsaufnahme: App-Umstellung auf das Journal-Design

Stand: 2026-11-16, Branch `feature/app-redesign`. Nur Bestandsaufnahme, noch keine Änderung an der App.

**Vorgehen:** Zuerst werden alle Bausteine in `components/journal/` fertig gebaut (auf
`/dev/components`), danach werden die Seiten einzeln umgestellt. Navigation und
Studyroom-Umbau lief später (2026-11-18); hier ging es zuerst um die Grundumstellung.

Nicht berücksichtigt: `app/dev/*` und `components/journal/*`.

---

## 1. Was die ganze App betrifft

### Schriften (Baloo 2 / Quicksand → Fraunces / Courier Prime)

- Geladen an einer einzigen Stelle: `app/layout.tsx` über `--font-display` (Baloo 2, 600/700)
  und `--font-body` (Quicksand, 500/600/700).
- Fraunces, Courier Prime und Caveat lädt bisher nur `app/dev/components/fonts.ts`, unter eigenen
  Variablennamen (`--font-fraunces`, `--font-courier-prime`, `--font-caveat`), die auf der
  Testseite auf die Rollen gemappt werden.
- Umstellen heißt: diese Fonts ins Root-Layout holen. `--font-display` und `--font-body` zeigen
  dann beide auf Fraunces, `--font-label` und `--font-hand` kommen neu hinzu. Die gut 70
  `var(--font-*)`-Stellen in rund 30 CSS-Modulen wechseln damit automatisch mit.

**Was dabei passiert:**

- Etwa 70 Regeln setzen `font-weight: 700/800`. Fraunces ist nur mit 400 und 600 geladen; der
  Browser rechnet dann ein künstliches Fett hinzu. Diese Regeln auf 600 setzen.
- Die fest eingetragenen Ersatzschriften `"Baloo 2"`, `Quicksand`, `ui-rounded` (in etwa 30
  Dateien) sind danach veraltet. Harmlos, aber auf `Georgia, serif` umstellen.
- Fraunces ist eine Serifenschrift und läuft breiter und höher. Zeilenhöhen, Button-Höhen und
  enge Leisten verschieben sich, vor allem im Studyroom.
- `components/tnum-fallback.tsx` ist ein Workaround nur für Quicksand (keine `tnum`-Ziffern).
  Danach wahrscheinlich überflüssig (genutzt von `level-xp-bar`). Noch nicht geprüft: ob Fraunces
  gleich breite Ziffern liefert.
- Landingpage (`app/page.tsx`) und `/dev/legacy` bekommen die neuen Schriften automatisch mit.

### `components/card.tsx` → `PaperPanel`

- Nur zwei Verwender: `app/settings/page.tsx` und `components/auth-layout.tsx`.
- Card hat `label`, `Card.Section` und `Card.Divider`; `PaperPanel` hat nichts davon.
  Abschnitts-Überschriften brauchen künftig ein `Label`.
- Drei Panels bauen den Card-Look selbst nach, ohne Card zu verwenden (weiß + `--shadow-panel`):
  `journey-header`, `streak-calendar`, `day-summary`.

### `components/button.tsx` → `components/journal/button.tsx`

| | Alt | Neu |
|---|---|---|
| Varianten | `primary`, `secondary`, `tonal`, `locked` | `primary`, `secondary`, `quiet` |
| Größen | `sm`, `md` | `md`, `lg` |
| Icon-Button | `IconButton` (`neutral`, `primary`) | – |

Offen:
- Wie werden die Größen übernommen (alt `sm`/`md` → neu `md`/`lg`)?
- Kein Gegenstück für `tonal` (Kaufen im Shop; To-do hinzufügen im Studyroom ist seit 2026-11-18 `secondary`) und
  `IconButton` (Zurück-Knopf in der Shop-Übersicht).
- `confirm-dialog` setzt eine eigene `warning`-Klasse auf den Primary-Button.
- Regel: `secondary` und `quiet` nur auf Papier, nie direkt auf dem Garten.

### Farbkleckse im Hintergrund

`.glow` / `.glowSecondary` (radial-gradient + `filter: blur`) in:
`components/page-shell.module.css`, `components/auth-layout.module.css`,
`app/shop/shop-overview.module.css`, `app/shop/[world]/shop.module.css`, `app/landing.module.css`.

Bleiben dürfen (Objekt- und Figurenschatten, keine Kleckse): radial-gradients in
`garden-scene`, `landing/garden-hero`, `.robinShadow` in `auth-layout`, `.imageWell` in
`shop-item-card` (fällt beim Shop-Umbau ohnehin weg).

### Gemeinsame Formular- und Hinweis-Komponenten

- `text-field`: `ink-soft` für `.help`, `.toggle`, `.input:disabled`.
- `confirm-dialog`: `.message` in `ink-soft`.

### Später (Navigation)

- `nav-bar`: Glass (`rgba(255,255,255,.86)` + `backdrop-filter: blur(14px)`), `.link` als Pills.
- `level-xp-bar` (in der Nav): `.level` weiß, Track/Fill als 999px, `.xp` in `ink-soft`,
  nutzt `TnumFallback`.

---

## 2. Nach Seite

Hinweis: Fortschrittsbalken (`level-xp-bar`; früher auch `session-progress-bar`) und Kalendertage
zählen nicht als Pills.

### Studyroom — umgestellt 2026-11-18

Erledigt (Konzept Phase 5, Plan in `docs/studyroom-plan.md`); die Bestandsaufnahme der alten Seite
ist damit überholt:

- **Rahmen:** Garten frei, darunter drei `PaperPanel`-Zettel mit Klebeband (Timer, To-do,
  Ambience). Das Glasfenster über dem Garten ist weg; der Countdown steht auf dem Timer-Zettel.
- **Ersetzt:** `.toolCard` → `PaperPanel`; `.modePills` → `ChoiceGroup`; `.miniInput` und
  `.todoInput` → `TextInput`; `.todoCheckbox` → `Checkbox strike`; `.soundSlider` → `Slider`
  (neu: `compact`); `.worldOption` → `ChoiceGroup` (gesperrte Orte „· Lv 10“); `Button` → der
  Journal-Button (Start primary, Pause secondary, End session quiet; `tonal` entfällt);
  Großbuchstaben-Labels → `Label`; `.rewardCard`, `.completeCard`, `.statTile` → `PaperPanel`;
  `session-progress-bar` → `SessionRail`; `.fullscreenButton`, `.stageNotice` → Papier-Chips.
- **Gelöscht:** `components/session-progress-bar`, `components/xp-icon` (samt
  `public/icons/xp.png`), alle Inline-Kartenicons, `--color-session-fill-break`; `.stageWindow`,
  `.iconButton`, `.statusBar` und die Pill-Klassen im CSS. Die Studyroom-Bausteine liegen jetzt
  in `components/studyroom/`, die Hooks in `lib/studyroom/`.
- **Bleibt (anderswo gebraucht):** `components/button` (Settings, Sign-in, Nursery u. a.),
  `coin-icon` (Nursery, Garden-HUD), `lock-icon` (Nursery).
- **Neu mit Daten:** To-dos liegen in `todos` (vorher Beispieldaten), die Welt-Wahl in
  `study_room_settings.background_world_id`. Keine neue SQL-Datei nötig.
- **Offen:** Ortsnamen in `worlds` sind deutsch („Garten“, „Berge“); die Level-Sperre gilt nur im
  Browser; die Sounds haben noch keinen Ton.

### Garden (`app/garden/page.tsx`, `garden.module.css`)

- **`garden-hud`:** `.pill` mit `.pillLabel` in `ink-soft`, `.levelBadge`, `.iconButton:disabled`
  in `ink-soft`
- **`inventory-tray`:**
  - Pills: `.tab`, `.tabCount`, `.countBadge`
  - Weiß: `.tab`, `.slot`
  - `ink-soft`: `.tab`, `.tabCount`, `.stateLabel`, `.empty`
- **`garden-object-popover`:** `.stage`, `.progress`, `.menu`, `.action` als Pills,
  gesperrte Schrift (`letter-spacing: 0.02em`), `ink-soft` in `.stage[data-stage="seed"]`,
  `.timeLeft`, `.action:disabled`
- **`confirm-dialog`:** Buttons secondary + primary (mit `warning`-Klasse), `.message` in `ink-soft`
- **`path-picker`:** `.menu` weiß
- **`inventory-badge`:** weiße Pille
- **`garden.module.css`:** `.error` als Pille, `.editBannerHint` in `ink-soft`
- Keine Card, keine Farbkleckse.

### Shop (künftig Nursery)

**Übersicht (`app/shop/page.tsx`, `shop-overview.module.css`)**
- Farbkleckse (`.glow`, `.glowSecondary`)
- `.walletPill` (weiße Pille), `.worldCard` weiß
- `IconButton` als Zurück-Knopf

**Welt (`app/shop/[world]/page.tsx`, `shop.module.css`)**
- Farbkleckse
- Reiter als Pills: `.tabList`, `.tabThumb` (weiß), `.tab`; `ink-soft` in `.tab` und `.tabCount`
- Button `secondary sm` (Z. 412)

**`shop-item-card`**
- Weiße Karte mit `--shadow-card` (harte Unterkante)
- `.tag`-Pills, `.lockBadge`
- Kaufen-Button als `tonal sm`
- `ink-soft`: `.locked .price`, `.ownedDetail`

**`shop-wallet`:** `.walletPill` als weiße Pille

Samentüten, Regal und Steckschild gehen über die Grundumstellung hinaus; hier zunächst nur die
Flächen tauschen.

### Statistics (künftig Journal) — umgestellt 2026-11-17

Erledigt (Konzept Phase 4); die Bestandsaufnahme der alten Seite ist damit überholt:

- **Rahmen:** `JournalSpread` (aufgeschlagenes Buch) statt `page-shell`-Karten; die Seite zeigt
  keine sichtbare Überschrift mehr, nur ein verstecktes `<h1>Journal</h1>`. `PageShell` bleibt für
  Settings (und bekam die Breite `spread`).
- **Ersetzt und gelöscht:** `journey-header`, `study-time-stat` → `JourneySummary`;
  `streak-calendar`, `day-summary` → `CalendarView` / `JournalCalendar` / `DayNote`;
  `app/journal/statistics.module.css` → `journal.module.css`. Alles Neue liegt in
  `components/journal-page/`.
- **Neu:** `JourneyPage` (Samenglas, `LuggageTag`, `PostageStamp` je Ort, Wochen-Stempel),
  `EmptyPage` (Leerzustand).
- **Daten:** Views `v_world_stamps` und `v_weekly_study` (`sql/journal-world-stamps.sql`,
  `sql/journal-weekly-study.sql`; in Dev ausgeführt, **Prod steht aus**).
- **Bleibt (anderswo gebraucht):** `alert`, `streak-icon` (Garden-HUD),   `lib/statistics/*` (Kalender-, Zeit- und Monatsdaten-Helfer).

### Settings (`app/settings/page.tsx`, `settings.module.css`)

- `Card` mit `Card.Section`-Labels in Großbuchstaben (`card.module.css .label`)
- Button primary zum Speichern (Z. 121), secondary zum Abmelden (Z. 145)
- Farbkleckse aus `page-shell`
- `.email` in `ink-soft`, dazu `text-field`

### Sign-in / Sign-up / Reset

Alles hängt an `components/auth-layout.tsx`: `Card` + Farbkleckse.

- **Buttons:**
  - Submit (primary): signin, signup, reset-password, reset-password/confirm
  - Href (primary): 2-mal in `reset-password/confirm`
  - Secondary `sm`: signin (Z. 112), signup (Z. 175), reset-password/confirm (Z. 168)
- `.subtitle` / `.hint` in `ink-soft` (signin, signup, reset-password)
- `text-field`, `alert`

### Landingpage (nicht in der ursprünglichen Liste, aber genauso betroffen)

- `app/landing.module.css`: Farbkleckse, `.subtitle` in `ink-soft`
- `components/landing/landing-ctas.tsx`: Buttons primary + secondary

---

## 3. Vorgeschlagene Reihenfolge

**Phase A – Bausteine fertig bauen** (nur `components/journal/` und `/dev/components`):

- Button-Lücken klären: Größen-Mapping, Ersatz für `tonal` und `IconButton`, Warn-Variante für
  den Bestätigungsdialog.
- Fehlende Bausteine laut Skill: `Stamp`, `RobinNote`, `XpRuler`; ggf. Ersatz für
  `Card.Section`/`Card.Divider` innerhalb von `PaperPanel`.

**Phase B – Seiten einzeln umstellen**, je ein Commit, danach Checkliste §11 des Skills:

1. **Schriften global:** Fonts ins Root-Layout, 700/800 → 600, Ersatzschriften tauschen,
   jede Seite auf Verschiebungen prüfen.
2. **`ink-soft` → `ink-muted` für Text:** mechanisch, nur bei Text (nicht Rahmen oder Icons).
3. **Button tauschen:** Importe umstellen, altes `components/button.tsx` löschen.
4. **Sign-in / Sign-up / Reset:** `auth-layout` umbauen (PaperPanel, Farbkleckse raus).
5. **Settings:** Card → PaperPanel, Abschnitts-Labels → `Label`. Danach `card.tsx` löschen.
6. **`page-shell`:** Farbkleckse raus (Settings + Statistics).
7. **Statistics (= Journal):** erledigt, siehe oben.
8. **Shop:** Farbkleckse, Wallet, Reiter, item-card auf Papier, Tags → Label. Ohne Regal-Umbau.
9. **Garden:** HUD, Inventar, Popover auf Papier, Pills → Label, Glass raus.
10. **Studyroom:** erledigt 2026-11-18, siehe oben und `docs/studyroom-plan.md`.

Später: Navigation (`nav-bar`, `level-xp-bar`), Landingpage.
