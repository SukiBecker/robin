"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LEGEND_ITEMS,
  addMonths,
  buildMonthGrid,
  compareMonths,
  formatDayLabel,
  formatMonthLabel,
  getDayState,
  monthOf,
  type DayState,
} from "@/lib/statistics/calendar";
import { formatStudyTime } from "@/lib/statistics/format";
import { useMonthData } from "@/lib/statistics/use-month-data";
import { DaySummary } from "./day-summary";
import styles from "./streak-calendar.module.css";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const POPOVER_WIDTH = 230; // matches .popover in day-summary.module.css
const NARROW_QUERY = "(max-width: 640px)";

type StreakCalendarProps = {
  userId: string;
  /** YYYY-MM-DD in the user's profile timezone. */
  today: string;
  /** Account creation date (user timezone) — no paging back before it. */
  firstDate: string;
  /** app_config.streak_min_minutes_per_day */
  streakMinMinutes: number;
};

/** Month calendar of streak days, Monday first. Days with study time open
    a small summary: a popover at the day, or a panel under the grid on
    narrow screens. */
export function StreakCalendar({ userId, today, firstDate, streakMinMinutes }: StreakCalendarProps) {
  const currentMonth = monthOf(today);
  const firstMonth = monthOf(firstDate);
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const narrow = useMediaQuery(NARROW_QUERY);

  const { data, error } = useMonthData(userId, month);
  const minSeconds = streakMinMinutes * 60;
  const cells = buildMonthGrid(month);

  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const canGoBack = compareMonths(month, firstMonth) > 0;
  const canGoForward = compareMonths(month, currentMonth) < 0;

  // returnFocus: back to the day that opened the summary (Escape, close
  // button) — not on an outside click, where focus goes where the user clicked.
  const close = useCallback(
    (returnFocus: boolean) => {
      if (returnFocus && selected) dayRefs.current.get(selected)?.focus();
      setSelected(null);
    },
    [selected]
  );

  function changeMonth(delta: number) {
    setSelected(null);
    setMonth((m) => addMonths(m, delta));
  }

  // Position the popover under the clicked day, kept inside the grid.
  useLayoutEffect(() => {
    if (!selected || narrow) {
      setPopoverPos(null);
      return;
    }
    const cell = dayRefs.current.get(selected);
    const wrap = wrapRef.current;
    if (!cell || !wrap) return;
    const centered = cell.offsetLeft + cell.offsetWidth / 2 - POPOVER_WIDTH / 2;
    setPopoverPos({
      top: cell.offsetTop + cell.offsetHeight + 8,
      left: Math.min(Math.max(centered, 0), wrap.clientWidth - POPOVER_WIDTH),
    });
  }, [selected, narrow]);

  // Move focus into the summary when it opens (keyboard users land on it).
  // The popover only mounts once its position is known, hence popoverPos.
  useEffect(() => {
    if (selected) panelRef.current?.focus({ preventScroll: !narrow });
  }, [selected, narrow, popoverPos]);

  // Escape / click outside closes. Clicks on a day are handled by the day
  // itself (switch or toggle), so they don't count as "outside".
  useEffect(() => {
    if (!selected) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element;
      if (panelRef.current?.contains(target) || target.closest("[data-day]")) return;
      close(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [selected, close]);

  const selectedDay = selected ? data?.[selected] : undefined;

  return (
    <section className={styles.panel} aria-labelledby="streak-calendar-heading">
      <div className={styles.header}>
        <h2 id="streak-calendar-heading" className={styles.title}>
          Day streak
        </h2>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => changeMonth(-1)}
            disabled={!canGoBack}
            aria-label="Previous month"
          >
            <Chevron direction="left" />
          </button>
          <span className={styles.monthLabel} aria-live="polite">
            {formatMonthLabel(month)}
          </span>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => changeMonth(1)}
            disabled={!canGoForward}
            aria-label="Next month"
          >
            <Chevron direction="right" />
          </button>
        </div>
      </div>

      {error && <p className={styles.error}>Couldn&apos;t load this month. {error}</p>}

      <div ref={wrapRef} className={styles.gridWrap} aria-busy={data === null}>
        <div className={styles.weekdays} aria-hidden="true">
          {WEEKDAYS.map((name) => (
            <span key={name} className={styles.weekday}>
              <span className={styles.weekdayLong}>{name.slice(0, 3)}</span>
              <span className={styles.weekdayShort}>{name[0]}</span>
            </span>
          ))}
        </div>

        <ol className={`${styles.grid} ${data === null ? styles.gridLoading : ""}`}>
          {cells.map((date, index) => {
            if (date === null) return <li key={`blank-${index}`} aria-hidden="true" />;

            const seconds = data?.[date]?.seconds ?? 0;
            const state = getDayState(date, today, seconds, minSeconds);
            const className = [
              styles.day,
              styles[state],
              date === today ? styles.today : "",
              date === selected ? styles.selected : "",
            ].join(" ");
            const dayNumber = Number(date.slice(8));
            const clickable = state !== "future" && seconds > 0;

            return (
              <li key={date}>
                {clickable ? (
                  <button
                    type="button"
                    data-day
                    ref={(el) => {
                      if (el) dayRefs.current.set(date, el);
                      else dayRefs.current.delete(date);
                    }}
                    className={className}
                    aria-expanded={date === selected}
                    aria-label={`${formatDayLabel(date)}${date === today ? ", today" : ""}, ${formatStudyTime(seconds, "today")} studied`}
                    onClick={() => setSelected((current) => (current === date ? null : date))}
                  >
                    {state === "studied" && <Sprout className={styles.sprout} />}
                    <span className={styles.number}>{dayNumber}</span>
                  </button>
                ) : (
                  <span
                    className={className}
                    aria-label={`${formatDayLabel(date)}${date === today ? ", today" : ""}`}
                  >
                    <span className={styles.number}>{dayNumber}</span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        {selected && selectedDay && !narrow && popoverPos && (
          <DaySummary
            ref={panelRef}
            variant="popover"
            date={selected}
            day={selectedDay}
            onClose={() => close(true)}
            style={{ top: popoverPos.top, left: popoverPos.left }}
          />
        )}
      </div>

      {selected && selectedDay && narrow && (
        <DaySummary
          ref={panelRef}
          variant="inline"
          date={selected}
          day={selectedDay}
          onClose={() => close(true)}
        />
      )}

      <ul className={styles.legend}>
        {LEGEND_ITEMS.map((item) => (
          <li key={item.state} className={styles.legendItem}>
            <LegendSwatch state={item.state} />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function LegendSwatch({ state }: { state: DayState }) {
  return (
    <span className={`${styles.swatch} ${styles[state]}`} aria-hidden="true">
      {state === "studied" && <Sprout className={styles.sprout} />}
    </span>
  );
}

/** Growth-green sprout behind a studied day's number. */
function Sprout({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 22V11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13.5C12 9 8.8 6.5 4 6.5c0 4.5 3.2 7 8 7z" fill="currentColor" />
      <path d="M12 11c0-4.5 3.2-7 8-7 0 4.5-3.2 7-8 7z" fill="currentColor" />
    </svg>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d={direction === "left" ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = () => setMatches(list.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
