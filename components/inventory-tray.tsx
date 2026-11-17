"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent,
} from "react";
import Link from "next/link";
import type { InventoryItem } from "@/app/garden/page";
import { getItemIllustration } from "@/lib/garden/item-visuals";
import {
  formatGrowthDuration,
  growthStateLabel,
  isSeedState,
} from "@/lib/inventory/seed-state";
import {
  PathShapeMenu,
  RotateMenu,
  pathStyleGroups,
  type PathStyleGroup,
} from "./path-picker";
import { SeedPacketImage } from "./seed-packet-image";
import styles from "./inventory-tray.module.css";

type TrayTabId = "flowers" | "plants" | "decor" | "paths";

/** Tray tabs, their inventory filter, and the shop tab they link to when
    empty (the shop only has Plants/Decor; path styles are sold in Decor). */
const TABS: Array<{
  id: TrayTabId;
  label: string;
  shopTab: "plants" | "decor";
  matches: (item: InventoryItem) => boolean;
}> = [
  {
    id: "flowers",
    label: "Flowers",
    shopTab: "plants",
    matches: (item) => !item.unlimited && item.category === "flower",
  },
  {
    id: "plants",
    label: "Plants",
    shopTab: "plants",
    matches: (item) => !item.unlimited && item.category === "plant",
  },
  {
    id: "decor",
    label: "Decor",
    shopTab: "decor",
    matches: (item) => !item.unlimited && item.category === "decoration",
  },
  {
    id: "paths",
    label: "Paths",
    shopTab: "decor",
    matches: (item) => Boolean(item.unlimited),
  },
];

const TAB_STORAGE_KEY = "bloomly.garden.trayTab";

function loadTab(): TrayTabId {
  try {
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some((tab) => tab.id === saved)
      ? (saved as TrayTabId)
      : "flowers";
  } catch {
    return "flowers";
  }
}

function saveTab(id: TrayTabId) {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, id);
  } catch {
    // Storage unavailable — the tray just starts on Flowers next time.
  }
}

/** Fixed slot order: name, then seed before grown. */
function bySlotOrder(a: InventoryItem, b: InventoryItem) {
  return a.name.localeCompare(b.name) || Number(a.isGrown) - Number(b.isGrown);
}

type InventoryTrayProps = {
  /** Edit mode: slides in. Otherwise it slides out and is inert. */
  open: boolean;
  items: InventoryItem[] | null;
  selected: { itemId: string; isGrown: boolean } | null;
  /** page.tsx's handleSelectItem — selecting the selected slot clears it. */
  onSelect: (item: InventoryItem) => void;
  /** The placement rotation, for the rotate button. */
  rotation: number;
  /** The selected item can be turned (bench, pavilion, hedge, …): shows a
      rotate button — paths get theirs inside the shape menu. */
  canRotate: boolean;
  onRotate: () => void;
  disabled: boolean;
  /** A slot pulled upwards out of the tray (mouse or touch): the page
      takes the drag over from here (pointer position in client px). */
  onSlotDragStart?: (item: InventoryItem, x: number, y: number) => void;
};

/**
 * Edit-mode inventory: a cream tray at the bottom with category tabs and
 * a horizontally scrolling row of square item slots. Seed and grown
 * stock are separate slots: seeds show a seed packet with the item on its
 * label, grown ones the plain illustration, each with a short state line
 * underneath. Path styles have unlimited stock and open a
 * small shape/rotate menu when selected.
 */
export function InventoryTray({
  open,
  items,
  selected,
  onSelect,
  rotation,
  canRotate,
  onRotate,
  disabled,
  onSlotDragStart,
}: InventoryTrayProps) {
  const [tabId, setTabId] = useState<TrayTabId>("flowers");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ start: false, end: false });

  // A press on a slot becomes a drag once it has moved 8px, mostly
  // upwards — sideways is left to the row's own scrolling (the slots are
  // touch-action: pan-x). The click a drag ends with is swallowed.
  const pressRef = useRef<{
    item: InventoryItem;
    x: number;
    y: number;
    id: number;
  } | null>(null);
  const swallowClickRef = useRef(false);
  const dragStartRef = useRef(onSlotDragStart);
  dragStartRef.current = onSlotDragStart;

  useEffect(() => {
    function move(event: PointerEvent) {
      const press = pressRef.current;
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.x;
      const dy = event.clientY - press.y;
      if (Math.hypot(dx, dy) < 8) return;
      pressRef.current = null;
      if (dy < 0 && -dy > Math.abs(dx) && dragStartRef.current) {
        swallowClickRef.current = true;
        dragStartRef.current(press.item, event.clientX, event.clientY);
      }
    }
    function end() {
      pressRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  function slotPointerProps(item: InventoryItem) {
    return {
      onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
        swallowClickRef.current = false;
        if (disabled || event.button !== 0) return;
        pressRef.current = {
          item,
          x: event.clientX,
          y: event.clientY,
          id: event.pointerId,
        };
      },
    };
  }

  /** A slot's click, unless it was the end of a drag. */
  function clickUnlessDragged(action: () => void) {
    return () => {
      if (swallowClickRef.current) {
        swallowClickRef.current = false;
        return;
      }
      action();
    };
  }

  // Browser storage only exists client-side, so the remembered tab is
  // read after mount.
  useEffect(() => setTabId(loadTab()), []);

  const tab = TABS.find((candidate) => candidate.id === tabId) ?? TABS[0];

  const counts = useMemo(() => {
    const all = items ?? [];
    return Object.fromEntries(
      TABS.map(({ id, matches }) => [
        id,
        id === "paths"
          ? pathStyleGroups(all.filter(matches)).length
          : all.filter(matches).length,
      ])
    ) as Record<TrayTabId, number>;
  }, [items]);

  const slots = useMemo(
    () => (items ?? []).filter(tab.matches).sort(bySlotOrder),
    [items, tab]
  );
  const pathGroups = useMemo(
    () => (tab.id === "paths" ? pathStyleGroups(slots) : []),
    [tab.id, slots]
  );

  const isSelected = (item: InventoryItem) =>
    selected?.itemId === item.itemId && selected.isGrown === item.isGrown;
  const selectedPathGroup = pathGroups.find((group) =>
    group.shapes.some(({ item }) => isSelected(item))
  );

  function selectTab(id: TrayTabId) {
    setTabId(id);
    saveTab(id);
    rowRef.current?.scrollTo({ left: 0 });
  }

  // WAI-ARIA tabs: arrows/Home/End move focus and selection together;
  // only the active tab is in the Tab order (same as the shop).
  function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((candidate) => candidate.id === tab.id);
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    selectTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  // Soft fades at the row's edges while there's more to scroll to.
  function updateFade(row: HTMLDivElement) {
    const start = row.scrollLeft > 2;
    const end = row.scrollLeft + row.clientWidth < row.scrollWidth - 2;
    setFade((current) =>
      current.start === start && current.end === end ? current : { start, end }
    );
  }
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    updateFade(row);
    const observer = new ResizeObserver(() => updateFade(row));
    observer.observe(row);
    return () => observer.disconnect();
  }, [slots, pathGroups]);

  function renderItemSlot(item: InventoryItem) {
    const image = item.imageAssetUrl ?? getItemIllustration(item.name, "grown");
    const row = { is_grown: item.isGrown };
    const seed = isSeedState(item, row);
    const state = growthStateLabel(item, row);
    const duration =
      item.growthDurationSeconds === null
        ? null
        : formatGrowthDuration(item.growthDurationSeconds);
    const shortDuration =
      item.growthDurationSeconds === null
        ? null
        : formatGrowthDuration(item.growthDurationSeconds, "short");

    const stateText =
      state === "seed"
        ? duration
          ? `Seed – grows with ${duration} of study time`
          : "Seed"
        : state === "grown"
          ? "Grown – ready right away"
          : null;
    const alt =
      state === "seed"
        ? `Seed: ${item.name}`
        : state === "grown"
          ? `${item.name}, grown`
          : item.name;
    const label = stateText
      ? `${item.name}. ${stateText}. ${item.quantity} left`
      : `${item.name}, ${item.quantity} left`;
    const tooltip = stateText
      ? `${item.name}\n${stateText}\n${item.quantity} left`
      : `${item.name} · ${item.quantity} left`;

    const chosen = isSelected(item);
    return (
      <button
        key={`${item.itemId}-${item.isGrown}`}
        type="button"
        className={`${styles.slot} ${chosen ? styles.slotSelected : ""}`}
        data-state={state ?? undefined}
        onClick={clickUnlessDragged(() => onSelect(item))}
        {...slotPointerProps(item)}
        disabled={disabled}
        aria-pressed={chosen}
        aria-label={label}
        title={tooltip}
      >
        <span className={styles.slotArt}>
          {seed ? (
            <SeedPacketImage src={image} category={item.category} alt={alt} />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.slotImage} src={image} alt={alt} />
          ) : (
            <span className={styles.slotFallback} aria-hidden="true" />
          )}
        </span>
        {state && (
          <span className={styles.stateLabel} aria-hidden="true">
            {state === "seed" ? (
              shortDuration ? (
                <>
                  <span className={styles.stateClock}>⏱</span>
                  {shortDuration}
                </>
              ) : (
                "Seed"
              )
            ) : (
              "Grown"
            )}
          </span>
        )}
        <span className={styles.countBadge} aria-hidden="true">
          {item.quantity}
        </span>
      </button>
    );
  }

  function renderPathSlot(group: PathStyleGroup) {
    const first = group.shapes[0].item;
    const image = getItemIllustration(first.name, "grown");
    const chosenShape = group.shapes.find(({ item }) => isSelected(item));
    const label = `${group.style} path, unlimited`;
    return (
      <button
        key={group.style}
        type="button"
        className={`${styles.slot} ${chosenShape ? styles.slotSelected : ""}`}
        // Selecting the style picks its first shape; selecting it again
        // puts the path away (handleSelectItem toggles).
        onClick={clickUnlessDragged(() => onSelect(chosenShape?.item ?? first))}
        {...slotPointerProps(chosenShape?.item ?? first)}
        disabled={disabled}
        aria-pressed={Boolean(chosenShape)}
        aria-label={label}
        title={label}
      >
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.slotImage} src={image} alt="" />
        )}
        <span
          className={`${styles.countBadge} ${styles.countInfinite}`}
          aria-hidden="true"
        >
          ∞
        </span>
      </button>
    );
  }

  const empty =
    tab.id === "paths" ? pathGroups.length === 0 : slots.length === 0;

  return (
    <section
      className={styles.tray}
      data-open={open || undefined}
      inert={!open}
      aria-hidden={!open}
      aria-label="Inventory"
    >
      <div className={styles.header}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Item categories"
          onKeyDown={handleTabKeyDown}
        >
          {TABS.map((candidate, index) => {
            const active = candidate.id === tab.id;
            return (
              <button
                key={candidate.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`tray-tab-${candidate.id}`}
                aria-selected={active}
                aria-controls="tray-panel"
                tabIndex={active ? 0 : -1}
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                onClick={() => selectTab(candidate.id)}
              >
                {candidate.label}
                <span className={styles.tabCount}>{counts[candidate.id]}</span>
              </button>
            );
          })}
        </div>

        {/* Inside the tray (not floating above it), so it never covers
            the edit banner sitting right on top of the tray. */}
        {selectedPathGroup ? (
          <div className={styles.pathMenu}>
            <PathShapeMenu
              group={selectedPathGroup}
              selectedItemId={selected?.itemId ?? null}
              onSelect={onSelect}
              rotation={rotation}
              onRotate={onRotate}
              disabled={disabled}
            />
          </div>
        ) : (
          canRotate && (
            <div className={styles.pathMenu}>
              <RotateMenu
                rotation={rotation}
                onRotate={onRotate}
                disabled={disabled}
              />
            </div>
          )
        )}
      </div>

      <div
        id="tray-panel"
        role="tabpanel"
        aria-labelledby={`tray-tab-${tab.id}`}
        className={styles.panel}
        data-fade-start={fade.start || undefined}
        data-fade-end={fade.end || undefined}
      >
        {empty ? (
          <p className={styles.empty}>
            <span>
              Nothing here yet —{" "}
              <Link
                href={`/nursery/garten?tab=${tab.shopTab}`}
                className={styles.emptyLink}
              >
                visit the shop
              </Link>
            </span>
          </p>
        ) : (
          <div
            ref={rowRef}
            className={styles.row}
            onScroll={(event: UIEvent<HTMLDivElement>) =>
              updateFade(event.currentTarget)
            }
          >
            {tab.id === "paths"
              ? pathGroups.map(renderPathSlot)
              : slots.map(renderItemSlot)}
          </div>
        )}
      </div>
    </section>
  );
}
