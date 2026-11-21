# Robin — Product Source of Truth

> **Elevator pitch:** *"Duolingo trifft Animal Crossing fürs Lernen"* — a gamified study/productivity app for students that turns focused study time into a living, personal garden.

This document consolidates every product, economy, design, and architecture decision made for Robin so far. It is meant to be the canonical reference — when in doubt, this file (plus the schema in `supabase/migrations/` and the economy numbers in §5) wins over memory or older chat context.

---

## 1. Vision & Positioning

Robin combines a **Pomodoro-based focus timer** with an **XP/coins/level/streak progression system**, a **virtual garden**, a **world-unlocking shop**, quests, achievements, and a mascot named **Robin**.

Visual/product identity sits deliberately between two reference poles:

- **Duolingo** → clarity, chunky "game-feel", loud/unmistakable reward moments, visible progress
- **Animal Crossing** → cozy, warm, collectible, illustrative, ambient rather than aggressive

The explicit anti-goal: Robin must never read as **childish**, **generic flat-design**, or a **SaaS dashboard with a green accent color**. The frontend is considered one of the product's most important assets — two users at the same level should be able to have completely different-looking gardens.

**Platform priority:** desktop version first, smartphone version afterward.

## 2. Target Audience

Students who want a focus/productivity tool that feels rewarding and personal rather than clinical — motivated by the same collect-and-personalize loop as Animal Crossing, with Duolingo-style clear extrinsic rewards (XP, coins, streaks) layered on top.

## 3. Core Gameplay Loop

```
Studyroom  →  Reward Engine  →  Garden  →  Shop
   ↑______________________________________|
```

1. User studies in the **Studyroom** (Pomodoro timer running against their own live garden as background).
2. On session completion, the **Reward Engine** (server-side, `complete_study_session()`) grants XP and coins, checks plant growth, syncs streaks, and evaluates quests/achievements.
3. XP levels the user up (unlocking new **worlds** later on); coins are spent in the **Shop**.
4. Shop purchases become **Garden** items, which grow over time and change what the Studyroom background looks like — closing the loop.

## 4. The Studyroom

- **Pomodoro Timer**: 25/5, 50/10, or flexible modes, with a progress indicator (V1: progress bar; design direction favors a circular SVG progress ring for a calmer, ambient feel over a linear bar).
- **Background = the user's own live garden**, always. This was a deliberately pulled-forward V1 core feature: there is only one world in V1, so no world-switcher is needed yet. The garden is rendered client-side from `garden_objects` / `v_garden_objects_with_progress`.
- **XP for later hours in a session**: an early concept idea ("more XP the longer/later into a session you study") was **superseded** by the finalized V1 economy — see §5. The final formula is flat/linear with no time-of-session bonus.
- **ToDo list** (V2 UI — schema/RLS already fully implemented since V1): simple list, no calendar/due-date UI yet in V2 (calendar linking for future todos/exam dates is a V4 feature, using the already-existing `todos.due_date`).
- **Ambient sounds** (V2): rain, white noise, waves, wind, fire — plus a sound effect when watering plants. Volume stored in `study_room_settings.sound_volumes`.
- **Quote feature** (V2): a changeable/refreshable quote, static or from an external content pool.
- **Post-session reward animation** (V2): Robin appears, +XP / +Coins / Daystreak+1 are shown — also during Pomodoro breaks.
- During the timer, UI intentionally **recedes visually** so the garden (the reward space) stays the focal point; timer/ToDo/quote float above it as a semi-transparent panel, not a full overlay.

## 5. Reward Engine — XP & Coins Economy (finalized)

All reward math happens **server-side** in `complete_study_session(session_id)`. The client only ever passes a session ID — never a reward value — which prevents client-side manipulation.

### XP formula
```
xp = floor(duration_seconds / 60) * 2   -- 2 XP per full minute, no cap, no bonus, no tiers
```

### Coins formula
```
coins = floor(duration_seconds / 60)    -- 1 coin per full minute
```

**Design intent:** XP is always exactly **2× coins** per session. This was a deliberate simplification for transparency — easy for players to understand, easy for the team to balance. Additional coin sources (day-streak bonus, achievements, quests) flow through the same `reward_transactions` ledger with `source_type` = `streak_bonus` / `achievement` / `quest`.

### Level curve
`profiles.level` is **never stored** — it is always derived from XP via `get_level(xp)`, to prevent the stored value and the true XP total from ever drifting out of sync.

Two-phase curve, tuned so that at a 30 min/day reference pace (~60 XP/day):

| Level range | XP per level | Notes |
|---|---|---|
| 1 – 10 | +25 XP/level | Level 10 (Beach unlock) reached at 225 XP, ≈ 3.75 days |
| 11 – 20 | +42 XP/level | Level 20 (Mountains unlock) reached at 645 XP, ≈ 10.75 days (exactly 7.0 days after Level 10) |
| 21 – 50 | +50 XP/level | Long-term progression beyond the last currently-defined world; pre-seeded to Level 50, extendable by just adding rows (no code change needed) |

In V1, the level number is displayed but **unlocks nothing yet**, since only one world (Garden) exists.

### Reward ledger & idempotency
Every reward write goes through `reward_transactions`, which has a `unique(source_type, source_id)` constraint — the same event (e.g. the same session, same quest-completion) can never be rewarded twice, even if a client retries a call.

## 6. Streak System

- A day counts toward the streak only once **≥ 15 minutes** of cumulative study time has been logged that day (`app_config.streak_min_minutes_per_day = 15`). This was explicitly "still unsure" in the original concept and has since been finalized at 15 minutes.
- **Non-toxic streak philosophy (explicit design principle):** small capped XP/coin bonus + milestone achievements (7 / 30 / 100 days) + a **streak freezer** as a safety net, auto-applied when a day is missed. **Hard resets and blocking mechanics (Duolingo-style) are explicitly rejected.**
- Streak sync is lazy (`sync_streak()`), running on session-end and app start, so multi-day absences are correctly back-filled (including auto-consuming freezers day-by-day until either activity is found or freezers run out).
- Streak Freezers are a purchasable consumable (Shop → Extras, 150–200 coins), `item_catalog.category = 'extra'`, flagged via `attributes->>'effect' = 'streak_freezer'`.
- **Main tree growth:** per the schema (`item_category` enum) and roadmap, the tree is a special case — `category = 'tree'` grows from `longest_streak`, not from accumulated study time like other plants. This decouples the centerpiece tree from the everyday XP/coin loop and ties it specifically to consistency over time.

## 7. Garden

- V1 covers a single world: **Garden**.
- Items are placed/removed via `place_garden_object()` / `remove_garden_object()` RPCs — never direct table writes, so inventory always stays consistent.
- **Growth**: flowers and plants grow based on *cumulative study time since being planted* (`garden_object_growth_seconds()`, surfaced via `v_garden_objects_with_progress.growth_percent`). Growth is shown in **discrete stages** (e.g. seed → sprout → half → bloomed) with a soft crossfade between stages, not continuous image scaling — continuous interpolation looks unnatural with raster illustration assets.
- **Removing a plant loses its growth progress** — *unless* it was already fully grown. Fully grown items return to inventory flagged `is_grown = true`, and replanting them is instantly complete again (no re-growing). This is why `inventory` is keyed on `(profile_id, item_id, is_grown)` — grown and ungrown stock of the same item are tracked separately.
- Placement is **free-form** (pos_x/pos_y/rotation/scale), not grid-locked — objects can overlap and vary in scale, reinforcing the "no two gardens look alike" goal.
- Placing has a satisfying "drop" feel (slight scale overshoot bounce); actively-growing objects get a subtle shimmer/pulse (not kitschy).

## 8. Shop

**Selected UI paradigm: World Map.** A parchment-style map shows floating illustrated islands (one per world). Clicking an island opens a side drawer listing that world's items. The Garden shop (the only shop in V1) gets a **treehouse look**: wooden frame, vine decorations, a Robin perch — this is the single highest-effort/most "premium, not generic" screen and the anchor for the whole visual identity.

Locked worlds are **visible but dimmed with a lock icon** — never fully hidden — to build anticipation rather than hide progression.

### Item categories
| Category | Grows? | Placeable? | Shipped |
|---|---|---|---|
| `flower` | yes (study time) | yes | V1 |
| `plant` | yes (study time) | yes | V1 |
| `decoration` | no | yes | V1 |
| `tree` | yes (longest streak, special case) | yes | (structural from V1, feature active V3) |
| `extra` (tools/consumables, e.g. streak freezer, double-XP boost) | n/a | **no** | V2 |
| `atmosphere` (night mode, seasons, rain — cosmetic) | n/a | **no** | V4 |

- V1 shop is intentionally restricted to `flower` / `plant` / `decoration`.
- All purchases go exclusively through the `purchases` table (never `reward_transactions` — that ledger is income-only).
- Purchasing checks the user's **level** against `item_catalog.unlock_level` server-side (`purchase_item()`), and atomically deducts coins.

### Pricing tiers (based on 1 coin/minute studied; target: first items within days, signature items as a multi-week goal)

| Tier | Example items | Unlock level | Price (coins) | Days @ 30 coins/day | Days @ 60 coins/day |
|---|---|---|---|---|---|
| 1 – Starter | simple flower | 1 | 80–150 | 3–5 | 1–3 |
| 2 – Common | Lavender, Sunflower, Garden Lantern | 1 | 250–400 | 8–13 | 4–7 |
| 3 – Uncommon | Orchid, Wooden Bench | 5–10 | 500–800 | 17–27 | 8–13 |
| 4 – Rare | Stone Fountain, larger decor | 15–20 | 1,000–1,800 | 33–60 | 17–30 |
| 5 – Signature | Cherry tree, Pavilion | 30–60 | 2,500–4,000 | 83–133 | 42–67 |
| Extras | Streak Freezer (consumable) | 1 | 150–200/unit | 5–7 | 3 |
| Atmosphere | Sound/background themes | variable | 600–1,000 | 20–33 | 10–17 |

Decoration items are priced roughly **1.3×–1.5× higher** than comparable plant tiers, since they're permanent/one-time purchases rather than something that re-grows/regrows over time.

### Reference garden shop catalog (concept-level example pricing)
- **Flowers:** Roses (red/pink) 90, Tulips (pink/orange/yellow) 60, Lavender 100, Daisies (small), Sunflower (Level 7) 350, Peony (pink) 200
- **Plants:** Small round bush 50, Hedge 60
- **Decoration:** Wooden bench 150, Stone fountain (garden-world highlight) 500, Garden lanterns 200, Garden Pavilion (highlight) 500, wooden/stone path — buy the *style* once, then build unlimited path tiles, 300

*(Note: an earlier reference set — Lavender 450, Sunflower 600, Orchid 750, Bench 800, Fountain 1,200 — fits tiers 2–4 fine and doesn't strictly need to change; the real gap is a genuine entry tier under 150 coins for "first 3 days" items.)*

Everything is purchased with **coins only** — there's no separate premium/hard currency in the core loop. Monetization is handled separately via cosmetic IAP (see §12).

## 9. Worlds & Level Unlocks

| World | Unlock level | Theme elements |
|---|---|---|
| Garden | 1 | grass base; flowers, bushes, bench, fountain |
| Beach | 10 | shells, palms, lounger, lighthouse, waves |
| Mountains | 20 | eagle, mountain hut, rocks |
| Desert | 30 | cacti, oases, camels, dunes, sandstone |
| Arctic | 40 | northern lights, snowman, penguin, igloo |
| Jungle | 50 | waterfalls, parrots, lianas |
| Japanese Garden | 60 | sakura, koi pond, bamboo |
| Fantasy | 70 | luminous flowers, floating islands, crystals, magical trees |
| *(future ideas, unscheduled)* | — | Crystal Cave, Volcano |

The "map where more and more gets unlocked" is the core structural metaphor for long-term progression, fully realized by V4.

## 10. Quests & Achievements

- **Daily Quests** (e.g. "study 60 minutes today", "complete 3 ToDos") grant bonus XP/coins. Schema (`quests`, `quest_progress`, `evaluate_quests()`) runs from V1 onward technically, but the UI and active quest content ship in **V3**.
- **Achievements** (7/30/100-day streak, 100 hours studied total, etc.) work the same way (`achievements`, `achievement_progress`, `evaluate_achievements()`) — UI and active content also land in **V3**.
- Both are evaluated **atomically** as part of `complete_study_session()` — there is no separate manual "claim" step.

## 11. Statistics (screen name: Journal)

- **V1 (minimal):** today / all-time totals only (`v_daily_activity`).
- **V3 (expanded):** weekly/monthly views, a calendar showing streak days (including which days used a freezer), click a day → mini-summary (hours studied, tasks completed).
- **Built (2026-11-17, Phase 4):** the Journal is an open book — streak label, Today/Total, calendar (pressed bloom / feather, missed days unmarked, day notes), seed jar, "Next stop" tag, a postage stamp per place (`v_world_stamps`), weekly postmarks (`v_weekly_study`) and an empty state for new users. See `.claude/skills/robin-design/SKILL.md`.
- **V4:** "Top % of all users" percentile ranking (requires a new aggregating view/function over total study time across all profiles).
- Concept-level scope also includes: current day streak, level/garden overview, and the main tree as a visual proxy for long-term progress.

## 12. Mascot: Robin

Robin is a European robin (*Rotkehlchen*) — illustrated, characterful, cozy (reference art shows Robin in a knit hat). Robin:
- Runs the app **onboarding**, explaining first steps (V2 — deferred from V1 as "too animation-heavy" for a bare MVP).
- Appears in the **post-session reward animation** (+XP, +Coins, Daystreak+1), including during Pomodoro breaks.
- Has a dedicated **perch** in the Garden-world shop's treehouse design.

## 13. Visual & Design Direction

*(Full detail lives in the `robin-design` skill — this is the summary.)*

### Blending the two reference poles
| Screen | Weighting |
|---|---|
| Studyroom (timer running) | Animal Crossing-leaning — calm, garden is the star, UI recedes |
| Post-session reward / Level-up | Duolingo-leaning — loud, clear, celebratory |
| Shop / World Map | Animal Crossing illustration + Duolingo structural clarity (prices/CTAs always legible) |
| Statistics / Settings | Most neutral/functional, but still warm — never a cold table UI |

**Explicitly avoid:** childish comic-overload (excess stars/confetti at once), generic flat design ("Duolingo without soul"), photorealism (breaks the Animal Crossing feel), classic SaaS dashboard look (white cards + drop shadows + blue accent + Inter/system font).

### Color
No fixed palette yet — direction over hex codes:
- Warm/earthy base (sand/parchment tones, never pure white or black)
- A muted, saturated (not neon) green as the brand "growth/success" color
- A distinct accent color **per world**, derived from its landscape (Garden = green/pink blossoms, Beach = turquoise/sand-yellow, Mountains = stone-grey/pine-green, Desert = terracotta/ochre, Arctic = ice-blue/violet, Jungle = deep green/parrot-bright, Japanese Garden = sakura-pink/bamboo-green, Fantasy = purple/glow accents)
- **Coins** in amber `#F2B33D`, **XP** in copper `#C77B3C` (tokens `--color-coin` / `--color-xp` in `app/robin-theme.css`) — they need to be tell-apart-at-a-glance since they nearly always appear side by side, so always by color **and** icon
- Once a concrete palette is needed (design-tokens phase), pull it from an actual generated garden illustration rather than an abstract preset
- Journal-material tokens (paper, ink-muted, tape, stamps, `--shadow-paper`) are defined in `app/robin-theme.css` since 2026-11-14; the app page background is paper (`globals.css`, with `paper-texture.webp`) since 2026-11-17 (see `robin-design` §6).
- **`ink-soft` is never used for text; use `ink-muted`** (switched app-wide on 2026-11-17). `ink-soft` (#7A756B) only reaches 4.04:1 on paper (4.29:1 on canvas); `ink-muted` (#69645A) reaches 5.18:1. `ink-soft` stays for lines, pencil and icons only.

### Typography (decided 2026-11-14)
Three fonts, each with one job. Loaded via `next/font/google`, only the weights listed.

| Role | Variable | Font | Use for |
|---|---|---|---|
| Display | `--font-display` | Fraunces 400 / 600 | Headings, body text, buttons, big numbers (XP, coins, level, the timer) |
| Label | `--font-label` | Courier Prime 400 | Small labels and metadata only (dates, categories, stamp text, prices on tags) — never below 13 px |
| Hand | `--font-hand` | Caveat 500 | Robin's voice only — at most one note per screen |

- Caveat is never used for controls (buttons, navigation, form fields), prices or numbers that matter.
- Big numbers stay in Fraunces, including the timer. Courier Prime is for small text, not large figures.
- Tabular figures (`tabular-nums`) for XP, coins and the timer — no layout jitter on digit change.
- Body text at least 16 px; Caveat set larger (it reads small).
- No uppercase letter-spaced labels; emphasis via label, weight or underline.
- Never a plain system/Inter-style font as the primary UI font.
- XP/Level/Streak numbers are set noticeably larger than typical app conventions.

Status: final since the building blocks were completed (2026-11-17); specimen on `/dev/components` (Fonts). **The app uses them everywhere since 2026-11-17** (Baloo 2 / Quicksand removed; fallback `Georgia, serif`). Fraunces is loaded in 400 and 600 only, so every bold is 600. Fraunces has no tabular figures: changing numbers use `TabularNumber` (see §13, Journal building blocks).

### Shape & materiality
- Large, consistent border-radius everywhere (no "corporate 4px" radius)
- Soft, warm-tinted shadows (derived from the relevant accent color, not generic grey)
- **Labels are paper, buttons are objects** (decided 2026-11-16, D5): a button never wears a label frame and is never a pill. The main action (`primary`) carries the material of the place — in the Garden world wood: `public/ui/button-wood.webp` as a wooden sign, text burnt in (`--color-wood-ink` `#36200F`, ≥ 4.5:1 on the wood). The ends with the nails stay fixed, the middle is a seamless tile (`button-wood-middle.webp`) that repeats instead of stretching, so the knot never smears. Hover lifts it slightly (bigger warm drop-shadow), active sinks it in; no motion under `prefers-reduced-motion`. `secondary` is an ink frame without fill, `quiet` underlined text — both on paper only. No hard edge below buttons.
- Organic, non-grid compositions in Garden/Shop (objects may overlap, vary in size)
- Illustrative raster assets (not icon fonts/line-SVGs) for plants, decor, worlds, Robin; UI chrome (buttons, nav, inputs) stays simpler/vector so illustrations don't get visually crowded out
- **Paper is an asset, not a CSS fill** (decided 2026-11-14): `PaperPanel` uses `public/ui/paper-note.webp` as a 9-slice (`border-image` with `fill`), so the torn, aged edges never stretch. Its shadow is `filter: drop-shadow(...)` (values from `--shadow-paper`), not `box-shadow`, so it follows the torn edge. Tape images stay opaque; transparency comes from `opacity: 0.9` in code.
- UI assets ship as WebP in `public/ui/` (target < 200 KB each); PNG originals live in `design-src/ui/`, which git ignores.

### Motion principles
- Every reward is felt, but motion is never gratuitous — timer ticking and form interactions stay calm; XP/coins/level-up/growth are the "loud" moments
- Non-linear, spring-like overshoot easing rather than linear/ease-in-out
- One orchestrated sequence beats many simultaneous small effects (e.g. session-end: Robin appears → XP counts up → coins fly in → streak pulses)
- Always respect `prefers-reduced-motion`
- Animate `transform`/`opacity` only where possible, for performance on weaker devices (relevant since mobile follows desktop)

Reference code patterns (button press, animated counters, coins "flying" to the counter via Framer Motion, orchestrated level-up sequence, discrete plant-growth crossfade) are maintained in the `robin-design` skill.

### Journal building blocks (final, D1–D8, 2026-11-17)

All blocks live in `components/journal/`, are shown on `/dev/components` (Paper and Studyroom background) and are the **only** parts pages are built from. Every block passes remaining props (`id`, `data-*`, `aria-*`, handlers, `style`) and `ref` to its root element (React 19: `ref` is a plain prop), sizes are in rem, and every animation sits inside `@media (prefers-reduced-motion: no-preference)`. Screenshot: `docs/screenshots/building-blocks.png`.

**Surfaces**

| Block | Main props | For | Not for |
|---|---|---|---|
| `PaperPanel` | `variant` plain \| lined \| grid · `tape` none \| top \| corners · `tilt` (±3°, wide panels ≤ 1°) · `padding` sm \| md \| lg · `as` div \| section \| article | Every surface that carries text; replaces the white card. Lined: direct children sit on the printed rules. | Nested panels, glass or blurred panels, anything with a `box-shadow` of its own. |
| `Label` | `variant` tag \| inline · `title` + `value` or `children` · `tilt` (±2°) · `as` span \| div | Short typewriter labels and values ("Studied today · 1 h 25 m"); replaces uppercase chips. | Buttons, long text, big numbers (Fraunces), navigation. |
| `RobinNote` | `surface` paper \| slip · `mood` neutral \| happy \| sad · `arrow` up \| down \| left \| right · `as` p \| div | Robin's voice: empty states, hints, special moments. At most one per screen, 1–2 short sentences. Slip directly on the garden, paper inside a `PaperPanel`. | Buttons, prices, important numbers, labels. `mood` only for special moments (onboarding, first bloom, level-up). |
| `Stamp` | `shape` round \| rect \| double · `top` / `center` / `bottom` · `plant` + `plantName` + `plantPrint` lines \| silhouette · `color` green \| rust \| blue · `size` sm \| md \| lg · `rotate` (±15°, default +4°) · `animate` | Places, weeks, achievements; printed ink on paper. `<StampDefs />` once in the root layout. | Directly on the garden or on the dark rim of `paper-note.webp`; ring text over ~11/12 characters (use rect/double); controls. |
| `GameIcon` | `name` coin \| xp \| streak \| freezer \| studyroom \| garden \| nursery \| journal \| herbarium \| settings · `size` 16 \| 24 \| 48 · `alt` | Currency and navigation icons in the asset style. Game icons from 16 px, navigation icons from 24 px. `alt` only when the icon stands alone. | Lucide or other icon sets; navigation icons below 24 px. Missing icons (nursery, journal, herbarium, settings) are dashed placeholders. |

**Actions**

| Block | Main props | For | Not for |
|---|---|---|---|
| `Button` | `variant` primary \| secondary \| quiet · `size` md \| lg · `icon` · `loading` · `disabled` · `href` (renders a link) | Primary = the main action as a wooden sign (material of the place). Secondary = hand-drawn ink frame, quiet = underlined text; both on paper only. | Pills, label frames, secondary/quiet directly on the garden, Robin's voice on a button. |

**Progress**

| Block | Main props | For | Not for |
|---|---|---|---|
| `XpSeedRow` | `value` · `max` · `level` (from the server) · `size` compact \| large | The standard XP display: furrow of ten pits, one seed per full tenth, the tenth in progress as a buried seed in quarters. Compact in the header, large in the Journal. Compact rows narrower than 30rem use five pits (20 % each; the buried seed stays). | Computing the level locally; the level-up moment (its own sequence); the garden background. |
| `XpSeedJar` | `value` · `max` · `level` · `caption` (text beside the jar instead of the amount; `null` = none) · `showLevel` | XP as a seed jar on the Journal page only (one size, 9 rem). | The header or any other screen. |

**Journey** (Journal page only; placeholder material until the painted assets exist, the props stay)

| Block | Main props | For | Not for |
|---|---|---|---|
| `JournalSpread` | `left` · `right` · `coverImage` + `coverSlice` (9-slice, later) · `ribbon` · `ribbonImage` (later) | The Journal page as an open book: cover all round (`--color-cover`), two pages with the fold from 48rem book width (pages darken towards the fold in paper tones — material, never a shadow), page stack lines at the outer edges, a 0.4rem silk ribbon (`--color-ribbon`) from the fold over the bottom edge. Narrower: one page, ribbon at the right edge. Pages are cut book paper, not the torn `PaperPanel`. Ribbon and stack are decorative. | Other screens; a second spread on a page; tilting. |
| `PostageStamp` | `place` · `unlockLevel` · `establishedAt` (ISO, from `v_world_stamps`) · `motif` (image path) · `color` green \| rust \| blue · `tilt` (±3°, default 0) | One stamp per place. Reached: perforated paper stamp with tape, picture in a printed frame, "est. Sep 2026", unlock level as its value. Not reached (no date): pencil outline, "Not yet issued". `role="img"` with the full sentence as `aria-label`. | Directly on the garden; more than one tilted stamp per panel; postmarks (use `Stamp`). |
| `LuggageTag` | `destination` · `unlockLevel` · `xpToGo` (from the server's thresholds) · or `arrived` · `tilt` (±3°, default −2°) | "Next stop": manila tag on a string with the next place and the XP still to go (`TabularNumber`). With `arrived`: "Last stop · All places reached". | The header. |

**Numbers**

| Block | Main props | For | Not for |
|---|---|---|---|
| `TabularNumber` | `children` (string or number: digits and `: , . /`) | A number that counts or ticks where its neighbours must not move: Studyroom timer, coin count, XP amount, level numbers (`AnimatedCounter` uses it). Every digit sits in a 0.62em cell, centred; `: , . /` are 0.3em, a space 0.25em. Inherits font, size and colour; screen readers get the plain text. Reason: Fraunces has no tabular figures — `font-variant-numeric: tabular-nums` does nothing and "1" is ~31 % narrower than "0". | Numbers that never change (prices, dates, labels); text with letters. |

**Navigation**

| Block | Main props | For | Not for |
|---|---|---|---|
| `Bookmark` | `href` · `icon` (navigation `GameIcon`, 24 px) · `label` · `active` · `iconOnNarrow` · Link props | One ribbon of the journal frame (variant A, 2026-11-17): hangs from the top edge of the header and out below it. Active = longer and stamp-green with paper text (4.86:1), the others short in a paper tone. The link is exactly the height of its row (`align-items: stretch`); that is the click area and what pages measure. The end below is decoration only (`pointer-events: none`) and may lie over the garden. Put the frame's drawn edge before the ribbons in the DOM. `iconOnNarrow`: below 55rem the ribbon shows only its icon (44 × 44 px), the active one keeps its label beside the icon; the label stays for screen readers. | Pills, buttons, anything that is not the main navigation. CSS ribbon for now, painted asset later (§21). Under 22rem the active ribbon shows its icon only as well (320 px: five ribbons plus a label do not fit). |

**Inputs** (always on paper; real `input` elements with a `label`, keyboard operable, disabled state)

| Block | Main props | For | Not for |
|---|---|---|---|
| `Checkbox` | `children` (label) · `strike` · native input props | To-dos and settings switches: hand-drawn box, a tick that draws itself (~250 ms). `strike` strikes done text through in ink (not grey). | Mutually exclusive choices (use `ChoiceGroup`). |
| `TextInput` | `label` · `hint` · `error` · `type` and native input props | Settings, sign-in: one hand-drawn writing line, label in Courier above. Errors in `error-deep` below the line. | A placeholder as the only label; multi-line text. |
| `Slider` | `label` · `thumb` pebble (default) \| ink · `min` / `max` / `value` / `defaultValue` · `unit` or `formatValue` | Sounds and other continuous values: ink track, firm ink fill, pebble or ink-blot handle. Use `unit` from a Server Component. | A handful of fixed choices; values that need exact entry. |
| `ChoiceGroup` | `legend` · `options` (`value`, `label`, `srLabel`, `disabled`) · `name` · `value` / `defaultValue` · `onChange(value, event)` | One of a few short options (25/5 · 50/10 · Flexible): words in Fraunces, the chosen one circled by a hand-drawn ellipse. Arrow keys move the choice. | Pills or segmented controls; long or many options (they wrap). |

**Shared ink** (`ink.tsx`): `InkRule` (hand-drawn line), `InkFrame` (hand-drawn frame) and `FocusFrame` (the one focus mark: ink frame in `--ink-stroke` over a paper halo, shown on `:focus-visible`). Drawn ink is never a straight CSS `border`; printed lines (lined `PaperPanel`, `Stamp`) are the only exception. New controls reuse these.

**Final fonts** (decided 2026-11-14, confirmed): Fraunces 400/600 (`--font-display`), Courier Prime 400 (`--font-label`, ≥ 13 px), Caveat 500 (`--font-hand`, Robin only). Loaded in `app/fonts.ts` (root layout); the role variables are mapped on `body` in `app/globals.css`.

**Tokens added for the journal** (all in `app/robin-theme.css`; contrast values are in the comments there):

| Token | Value | Role |
|---|---|---|
| `--color-paper` / `-paper-deep` / `-paper-line` | `#F7F0E1` / `#EEE3CC` / `#DED0B4` | Paper, darker layer, decorative lines (never for text) |
| `--color-ink-muted` | `#69645A` | Muted ink on paper (5.18:1); replaces `ink-soft` for text |
| `--color-tape-1` / `-tape-2` | honey / sage, ~0.6 alpha | Tape |
| `--color-stamp-green` / `-rust` / `-blue` | `#4A7250` / `#A4503A` / `#3E5A7E` | Printed stamps; blue is also Robin's fountain-pen ink |
| `--color-wood-ink` | `#36200F` | Burnt-in text on the wooden sign |
| `--color-error-deep` | `#A93F35` | The only error colour for text (5.37:1 on paper) |
| `--shadow-paper` / `--filter-paper` | warm brown | Paper shadow: `box-shadow` for straight edges, `drop-shadow` for the torn asset |
| `--filter-label` / `-wood` / `-wood-lift` / `-wood-press` / `-wood-faint` / `-pebble` | warm `drop-shadow`s | Shadows of single objects; no custom `drop-shadow` values in blocks |
| `--ink-fine` / `--ink-line` / `--ink-stroke` | `1px` / `1.5px` / `2.25px` | The three weights of drawn ink: guide lines · frames and outlines · deliberate strokes and focus |

### Screen-specific notes
- **Studyroom:** garden background always live; UI floats as a semi-transparent panel, never fully covering the garden.
- **Garden:** satisfying "drop" bounce on placement; growing objects get a subtle shimmer/pulse; free placement, not grid-locked.
- **Shop/World Map:** parchment map + floating islands; treehouse look for the Garden shop; locked worlds dimmed + lock icon, never hidden; prices/CTAs stay clearly legible as their own element, not baked into the illustration.
- **Statistics/Settings:** most functional screens, but still rounded panels + Robin palette + small illustrative accents rather than a plain data table.

## 14. Tech Stack & Build Approach

- **Frontend:** Next.js
- **Backend:** Supabase / PostgreSQL (RLS, `SECURITY DEFINER` RPC functions)
- **Claude Code:** architecture, design-critical UI, complex logic
- **Cursor:** mechanical scaffolding, boilerplate, repetitive wiring
- **Codex Desktop App:** used for initial project scaffolding (files must live in an explicitly user-created/opened folder, not the hidden `~/.codex/` directory)
- **Photopea:** image editing for shop-frame assets (transparent PNG export, coordinate recording for CSS absolute positioning)
- **RevenueCat:** IAP/subscription management
- **Vercel:** potential hosting (possibly avoidable if the product ends up fully native and only needs a marketing page)

**Working style:** small, focused, single-concern prompts to AI coding tools; Claude for architecture/complex logic/design-critical decisions, Cursor/Codex for mechanical scaffolding; decisions documented in this file and in the schema migrations (`supabase/migrations/`).

### Planned V1 build sequence
A 19-prompt Claude Code sequence across five phases:
1. Supabase connection verification
2. Auth & Profile (sign-up, sign-in, password reset, protected routes, sign-out, E2E verification)
3. Studyroom session loop
4. Design tokens
5. Garden wiring → Shop wiring

Two Claude skills support this build: the official Anthropic `frontend-design` skill for general UI critique/process, and the project-specific `robin-design` skill (visual system, economy-in-UI reference, screen-specific guidance) — both already in place.

Illustration asset production (style-locked island scenes, wooden-frame backgrounds, item icons as transparent PNGs) is **deferred until the core session loop is verified end-to-end**; Claude then builds the interactive UI layer around the generated raster assets (hybrid production — this solves the "medium mismatch" problem, since painterly AI-reference-image richness can't be replicated in pure CSS/SVG).

## 15. Database & Architecture Decisions

- **Schema as migrations** (`supabase/migrations/`, changed 2026-11-21): the first migration is a baseline dump of the live schema (`*_baseline.sql`), content data lives in `supabase/seed.sql`. Every later schema change is its own new migration (`supabase migration new <name>`); the baseline is not edited afterwards. This replaces the earlier single consolidated schema file, which had drifted behind the live database.
- **`profiles.level` is never stored** — always computed via `get_level(xp)` to prevent structural inconsistency between stored level and true XP.
- **Anti-cheat by construction:** `xp`, `coins`, `current_streak`, `longest_streak`, `last_study_date` on `profiles` (and the structural fields on `garden_objects`) are protected by triggers (`protect_profile_fields`, `protect_garden_object_fields`) that only allow writes from `current_user = 'postgres'` — i.e. only from `SECURITY DEFINER` RPCs, never direct client updates. Clients can still update non-protected fields directly (e.g. garden object position/rotation/scale).
- **Reward ledger idempotency:** `reward_transactions` has `unique(source_type, source_id)`, so the same event can never be rewarded twice even under retries.
- **Client never computes rewards.** The client passes only IDs (e.g. a session ID) into RPCs like `complete_study_session()`; all XP/coin/growth/streak/quest/achievement logic runs server-side.
- **Purchases vs. rewards are separate ledgers:** purchases are tracked only in `purchases`, never in `reward_transactions` (which is income-only).
- **Removing a plant** loses growth progress unless fully grown, in which case it returns to inventory as `is_grown = true` and replants instantly complete (see §7).
- Coordinate/position data (`pos_x`, `pos_y`, etc.) is extremely lightweight in Supabase — row count is not the cost driver; **compute, egress, and MAUs** are.
- **Recurring Supabase testing pattern:** every new SQL Editor session that calls RPCs using `auth.uid()` must start with:
  ```sql
  select set_config('request.jwt.claim.sub', '<uuid>', true);
  set role authenticated;
  ```
  (only persists for the current transaction). `GRANT` statements must run as `postgres` — always `reset role;` first, and never issue grants after `set role authenticated`.
- Nursery routing (renamed from Shop on 2026-11-17): `app/nursery/page.tsx` (world overview) + dynamic `app/nursery/[world]/page.tsx` — new worlds are purely additive to routing. The Journal lives at `app/journal/` (was `statistics`). `next.config.ts` redirects `/shop/*` → `/nursery/*` and `/statistics` → `/journal` permanently (308, query kept). The world slug is still `garten`.

## 16. Versioned Roadmap (V1 → V5)

**Core principle across all versions:** V1–V3 need only **content seeds** (worlds, items, quests) rather than structural schema changes — this is the most stable possible foundation. V4 stays almost purely additive. Only V5 steps outside the current schema's scope, which fits thematically too: social and payment features are separate subsystems, deliberately tackled last and with dedicated care (privacy, payment handling).

### V1 — MVP: Core Loop
**Goal:** the central loop (study → reward → garden grows) works completely and stably.
**Pages:** Studyroom, Garden, Shop, minimal Statistics, Settings.
**Explicitly excluded:** Robin onboarding (too animation-heavy), quests/achievements UI, sounds/animations.
**Schema changes needed:** none.

| Feature | Backend |
|---|---|
| Pomodoro timer (25/5, 50/10, flexible) + progress bar | `study_sessions`, `complete_study_session()` |
| Studyroom background = own live garden (one world, no switcher yet) | client-side render from `garden_objects` / `v_garden_objects_with_progress` |
| XP/coins from sessions | fully implemented in `complete_study_session()` |
| Garden (Garden world only): place/remove items | `garden_objects`, `place_garden_object()`, `remove_garden_object()` |
| Plant growth via cumulative study time | `garden_object_growth_seconds()`, `v_garden_objects_with_progress` |
| Shop: `flower` / `plant` / `decoration` only | `item_catalog`, `purchase_item()` |
| Level display (unlocks nothing yet — one world) | `get_level()`, `profiles_with_level` |
| Streak counting (no freezer yet) | `sync_streak()` |
| Statistics: "today" / "total" only | `v_daily_activity` |

### V2 — Onboarding, Feedback & Reward Feel
**Goal:** give the core loop personality and life — Robin, sound, animation.
**Schema changes needed:** none — new `item_catalog` entries + client features only.

- Robin onboarding intro
- Post-session Robin reward animation (+XP, +Coins, Daystreak+1), including in Pomodoro breaks
- Sound effects (watering can) + ambient Studyroom sounds (rain, white noise, waves, wind, fire); volume in `study_room_settings.sound_volumes`
- Quote feature (changeable/refreshable)
- ToDo list in Studyroom, no calendar (`todos` — CRUD + RLS already fully present in schema)
- Garden UX: return object to inventory / re-place it (logic already exists in `remove_garden_object()`, UI only)
- Shop "Extras" category: watering can (cosmetic), Streak Freezer, Double-XP Boost (freezer uses `sync_streak()`'s `attributes->>'effect'='streak_freezer'` logic; boost uses `reward_source_type = 'boost'`)

### V3 — Progression: Quests, Achievements & World Switcher
**Goal:** the loop gets goals and long-term motivation; the first map expansion starts.
**Schema changes needed:** none.

- Daily Quests UI (already running technically since V1 via `evaluate_quests()`, now gets UI + active content)
- Achievements UI (`achievements`, `achievement_progress`, `evaluate_achievements()`)
- Level-based world unlocks begin: Level 10 = Beach, Level 20 = Mountains (new `worlds` rows + `item_catalog` entries with `world_id`)
- Background switcher in Studyroom between now-multiple unlocked world-gardens (locked worlds show a lock icon)
- Main tree grows via streak instead of study time (`category = 'tree'`, growth from `longest_streak`)
- Statistics expanded: weekly/monthly views, calendar with streak days (incl. freezer days), click a day → mini-summary

### V4 — Full World Map & Atmosphere
**Goal:** fully build out the "more and more unlocks" map progression.
**Schema changes needed:** minimal — possibly one view/function for top-% ranking; otherwise content only.

- Remaining worlds: Desert (L30), Arctic (L40), Jungle (L50), Japanese Garden (L60), Fantasy (L70), plus bonus ideas (Crystal Cave, Volcano)
- Atmosphere items: Night Mode, Seasons, Rain (`category = 'atmosphere'`, purely cosmetic)
- Statistics: Top % of all users (new aggregating view/function, percentile over total study time)
- Breathing & meditation content before/during breaks (new standalone audio/content block)
- Calendar extension: plan ToDos for future dates / exam dates (uses existing `todos.due_date`)

### V5 — Social, Monetization & Final Decisions
**Goal:** everything the concept doc explicitly marked "Later" or "Still unsure."
**Special case:** unlike V2–V4, V5 needs genuinely **new tables** not in the current schema — but purely additive (new tables with FKs to `profiles.id`; existing tables/functions untouched).

- Connect with friends + ranking (explicitly "Later" in the original concept) — needs a `friendships`-style table + a ranking view over `profiles`
- Notification-blocking of other apps while the timer runs (client/OS feature, no DB needed)
- Finalize subscription model & pricing — payment provider integration (e.g. Stripe) — needs `subscriptions`/billing tables
- Final open decisions: desktop vs. mobile priority, minimum study time for a streak day (**note: this specific item is already resolved** — see §6, 15 minutes — `app_config.streak_min_minutes_per_day` was built as a swappable placeholder for exactly this kind of late-finalized value)

## 17. Monetization

- **Model:** hybrid — free core loop, small one-time cosmetic purchases, optional low-cost subscription for seasonal content.
- **IAP infrastructure:** RevenueCat.
- **Consideration:** Apple's Small Business Program commission rate is relevant to pricing/margin planning.
- Full pricing/subscription decisions are deliberately deferred to **V5**.

## 18. Competitors & Inspiration

Reference apps — approach is to **copy what works, fill their gaps, and improve on common criticisms**:
- LifeAt
- Pomodoro Crew
- Forest (app)
- Fokus-Timer: Tiefer Fokusflug (app)

## 19. Open Questions / Not Yet Decided

- Final subscription pricing (V5)
- Friends/ranking system design details (V5, "Later" by original design)
- Custom vine-and-flower scrollbar — explicitly scoped **out** of V1, planned as a later standalone component
- Concrete color palette — direction is set (see §13), final tokens to be pulled from actual generated garden illustrations once asset production starts. (Fonts are decided, see §13 Typography.)
- Illustration asset production itself — deferred until the core V1 session loop is verified end-to-end

## 20. Planned User Validation

A validation phase is planned once there's something testable: task-based feedback from **3–5 student peers**, using asynchronous methods — anonymous surveys and behavior observation preferred over direct opinion questions. A tailored Robin-specific question set has been discussed but not yet written.


## 21. Ideas (not scheduled)

Collected while building the journal building blocks; nothing here is decided.

- **Level-up harvests the full row** (2026-11-16): when the seed row (`XpSeedRow`) is full, the level-up moment harvests the ten seeds — they're gathered up and the row starts empty for the next level, instead of the row simply clearing.
- **A jar per level on the Journal shelf** (2026-11-16): on the Journal page, every finished level leaves its own seed jar (`XpSeedJar`) standing on a shelf — a row of filled jars as a record of how far you've come.
- **Pocket watch with a dial** (2026-11-17): the `studyroom` icon is the back of a pocket watch and reads as a bronze ball at small sizes. Regenerate it as the front (dial with hands), together with the still-missing `nursery`, `journal`, `herbarium` and `settings` icons. Navigation icons are used at 24 px or larger, so the new set can be drawn for that size.
- **Pebble as a painted asset** (2026-11-17): the Slider's pebble handle (`thumb="pebble"`, the default) is currently a CSS gradient with a highlight and a warm shadow (`--filter-pebble`). Next to the watercolour seed and the game icons it reads as rendered, not painted. Generate it as a small painted WebP in the asset style (like `seed.webp`, one pebble, ≈ 26 × 20 px at 1×, transparent background), together with the missing navigation icons above, then swap it in for the gradient in `slider.module.css`.
- **Bookmark ribbon as a painted asset** (2026-11-17): the navigation ribbons (`Bookmark`) are a CSS placeholder for now — flat fabric colour, faint woven lines, a swallowtail cut by `clip-path`. Generate the ribbon as a painted asset in the garden-asset style: one ribbon in a paper/linen tone and one in stamp-green, prepared as a 9-slice (fixed swallowtail end, stretchable middle, so the length can change), then swap it in for the gradients in `bookmark.module.css`.

---

### Reference files
- `supabase/migrations/` — the single source of truth for backend structure/logic (baseline plus later migrations); `supabase/seed.sql` — catalog and balancing data
- §5 of this file — finalized XP/coin/level/streak/pricing numbers
- `bloomlyroadmapv1v5.pdf` — full versioned feature roadmap (extern, nicht im Repo; liegt im Claude-Projekt)
- `Bloomly.pdf` — original concept doc (extern, nicht im Repo; liegt im Claude-Projekt): general features, competitors, page structure, world list, Robin reference art
- `robin-design` (Claude skill) — full visual/animation design system with concrete code patterns
