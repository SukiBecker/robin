# Zielstruktur (Phase "Struktur", nach dem Nursery-Merge)

Stand: 2026-11-21. Das ist eine Notiz, noch nichts davon ist umgesetzt. Die Umbauten
bewusst erst nach dem Merge von `feature/nursery-shelf` machen, damit der Branch nicht
in Verschiebungen hineinläuft. Jeder Schritt ein eigener Commit, danach `tsc`, `lint`,
`build` und `npm test`.

## Ist-Zustand, der stört

- `components/` ist flach (rund 40 Dateien) und mischt Feature-Komponenten
  (`garden-*`, `inventory-*`, `path-picker`) mit Basis-Bausteinen (`button`, `card`, `alert`,
  `text-field`, `confirm-dialog`).
- Zwei Generationen von Bausteinen: alt (`components/button.tsx`, `card.tsx`, `text-field.tsx`,
  `alert.tsx`) und neu (`components/journal/*`). Die Seiten Studyroom, Garden, Settings und
  Auth nutzen noch die alten (siehe `docs/migration-inventory.md`, Phase B).
- `components/journal/` (Bausteine) und `components/journal-page/` (Seitenteile) sind
  schwer zu unterscheiden.
- Namen aus alten Zeiten: `lib/statistics/` (Seite heißt `/journal`), `lib/shop/` und
  `shop*.module.css` (Route heißt `/nursery`).

## Zielbild

```
app/                      Routen, robin-theme.css, globals.css
components/
  ui/                     Basis: button, card, alert, text-field, confirm-dialog, page-shell
  journal/                Journal-Bausteine (PaperPanel, Label, Stamp, ...)
  journal/page/           bisher components/journal-page/ (Kalender, Journey, Tagesnotiz)
  garden/                 garden-scene, -hud, -minimap, -object-popover, path-picker,
                          inventory-tray, inventory-badge
  nursery/                Regal-Bausteine, shop-wallet, seed-packet-image
  landing/  auth/  nav/   auth-layout, auth-watcher, nav-bar, level-up-note
  icons/                  coin-icon, xp-icon, lock-icon, streak-icon
lib/
  journal/                bisher lib/statistics/ plus lib/journal/
  nursery/                bisher lib/shop/
  garden/ auth/ inventory/ landing/ supabase/ copy/ motion/
supabase/migrations/      Baseline plus alle weiteren Schemaänderungen
docs/                     nur Markdown, Bilder in design-src/
```

## Reihenfolge

1. Alte Basis-Bausteine nach `components/ui/` (nur verschieben, Importe anpassen).
2. Feature-Komponenten nach `components/garden/` und `components/nursery/`.
3. `components/journal-page/` nach `components/journal/page/`.
4. `lib/statistics/` nach `lib/journal/` zusammenführen, `lib/shop/` nach `lib/nursery/`.
5. CSS-Module umbenennen (`shop*.module.css` nach `nursery*.module.css`).
6. Alte Bausteine ablösen, sobald die Seiten umgestellt sind (Phase B der
   Bestandsaufnahme): `button`, `card`, `text-field`, `alert`.

Dabei Barrel-Dateien (`index.ts`) vermeiden, die Importe bleiben explizit über `@/components/...`.
