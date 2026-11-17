"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/journal/button";
import { FocusFrame, InkFrame } from "@/components/journal/ink";
import { GameIcon } from "@/components/journal/game-icon";
import {
  LEGEND_ITEMS,
  addMonths,
  buildMonthGrid,
  formatDayLabel,
  formatMonthLabel,
  getDayState,
  type DayState,
  type MonthKey,
} from "@/lib/statistics/calendar";
import { formatStudyTime } from "@/lib/statistics/format";
import type { MonthData } from "@/lib/statistics/use-month-data";
import { DayNote } from "./day-note";
import styles from "./calendar-view.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const NOTE_WIDTH_REM = 14; // matches .popover in calendar-view.module.css
const NARROW_QUERY = "(max-width: 40rem)";

const shortMonth = (m: MonthKey) =>
  new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(m.year, m.month - 1, 1))
  );

type CalendarViewProps = {
  month: MonthKey;
  /** null while loading. */
  data: MonthData | null;
  error?: string | null;
  /** YYYY-MM-DD in the profile timezone. */
  today: string;
  /** Account creation (profile timezone): nothing before it is "missed". */
  firstDate: string;
  /** app_config.streak_min_minutes_per_day in seconds. */
  minSeconds: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onMonthChange: (delta: -1 | 1) => void;
};

/** The Journal calendar (presentational; JournalCalendar loads the data).
    Monday first. Pressed bloom = studied, feather = freezer day; a missed
    day has no mark, only a paler number; today has a drawn ink frame. Days with something to tell are
    buttons: they open a small note (study time, to-dos done, XP) — at
    the day on wide screens, under the grid on narrow ones. Escape or a
    click outside closes it, focus returns to the day. */
export function CalendarView({
  month,
  data,
  error,
  today,
  firstDate,
  minSeconds,
  canGoBack,
  canGoForward,
  onMonthChange,
}: CalendarViewProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [notePos, setNotePos] = useState<{ top: number; left: number } | null>(
    null
  );
  const narrow = useMediaQuery(NARROW_QUERY);
  const cells = buildMonthGrid(month);
  // rows of seven (buildMonthGrid pads to whole weeks)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7)
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  // returnFocus: back to the day (Escape, Close) — not on an outside click,
  // where focus goes where the user clicked.
  const close = useCallback(
    (returnFocus: boolean) => {
      if (returnFocus && selected) dayRefs.current.get(selected)?.focus();
      setSelected(null);
    },
    [selected]
  );

  function changeMonth(delta: -1 | 1) {
    setSelected(null);
    onMonthChange(delta);
  }

  // Place the note under the selected day, kept inside the grid.
  useLayoutEffect(() => {
    if (!selected || narrow) {
      setNotePos(null);
      return;
    }
    const cell = dayRefs.current.get(selected);
    const wrap = wrapRef.current;
    if (!cell || !wrap) return;
    const width =
      NOTE_WIDTH_REM *
      parseFloat(getComputedStyle(document.documentElement).fontSize);
    // Measured against the wrapper (not offsetLeft: in a table the cell is
    // the button's offsetParent).
    const c = cell.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const centered = c.left - w.left + c.width / 2 - width / 2;
    setNotePos({
      top: c.bottom - w.top + 10,
      left: Math.min(Math.max(centered, 0), Math.max(w.width - width, 0)),
    });
  }, [selected, narrow]);

  // Move focus into the note when it opens.
  useEffect(() => {
    if (selected) noteRef.current?.focus({ preventScroll: !narrow });
  }, [selected, narrow, notePos]);

  useEffect(() => {
    if (!selected) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Element;
      if (noteRef.current?.contains(target) || target.closest("[data-day]"))
        return;
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
  const showNote = selected && selectedDay && (narrow || notePos);

  return (
    <section
      className={styles.calendar}
      aria-labelledby="journal-calendar-heading"
    >
      <div className={styles.header}>
        <h2 id="journal-calendar-heading" className={styles.title}>
          {formatMonthLabel(month)}
        </h2>
        <div className={styles.nav}>
          <Button
            variant="quiet"
            onClick={() => changeMonth(-1)}
            disabled={!canGoBack}
            aria-label={`Previous month, ${shortMonth(addMonths(month, -1))}`}
          >
            ← {shortMonth(addMonths(month, -1))}
          </Button>
          <Button
            variant="quiet"
            onClick={() => changeMonth(1)}
            disabled={!canGoForward}
            aria-label={`Next month, ${shortMonth(addMonths(month, 1))}`}
          >
            {shortMonth(addMonths(month, 1))} →
          </Button>
        </div>
      </div>

      {error && (
        <p className={styles.error}>Couldn&apos;t load this month. {error}</p>
      )}

      <div ref={wrapRef} className={styles.gridWrap} aria-busy={data === null}>
        <table
          className={`${styles.grid} ${data === null ? styles.loading : ""}`}
          aria-labelledby="journal-calendar-heading"
        >
          <thead>
            <tr>
              {WEEKDAYS.map((name, i) => (
                <th
                  key={name}
                  scope="col"
                  abbr={WEEKDAYS_LONG[i]}
                  className={styles.weekday}
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, row) => (
              <tr key={row}>
                {week.map((date, col) => {
                  if (date === null) return <td key={`blank-${col}`} />;

                  const day = data?.[date];
                  const seconds = day?.seconds ?? 0;
                  const state = getDayState(
                    date,
                    today,
                    firstDate,
                    seconds,
                    minSeconds,
                    day?.frozen
                  );
                  const clickable =
                    state !== "future" &&
                    state !== "before" &&
                    (seconds > 0 || !!day?.frozen || !!day?.todos);
                  const isToday = date === today;
                  const className = [
                    styles.day,
                    styles[state],
                    isToday ? styles.isToday : "",
                    date === selected ? styles.selected : "",
                  ].join(" ");
                  const content = (
                    <>
                      {isToday && <InkFrame className={styles.todayFrame} />}
                      <span className={styles.number}>
                        {Number(date.slice(8))}
                      </span>
                      <DayMark state={state} />
                    </>
                  );
                  // A day nobody can open still says what it was.
                  const note = [
                    isToday ? "today" : "",
                    state === "missed" ? "missed" : "",
                  ]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <td key={date}>
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
                          aria-label={dayLabel(date, state, isToday, seconds)}
                          onClick={() =>
                            setSelected((current) =>
                              current === date ? null : date
                            )
                          }
                        >
                          {content}
                          <FocusFrame className={styles.focus} />
                        </button>
                      ) : (
                        <span className={className}>
                          {content}
                          {note && (
                            <span className={styles.srOnly}>, {note}</span>
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {showNote && !narrow && notePos && (
          <DayNote
            ref={noteRef}
            date={selected}
            day={selectedDay}
            onClose={() => close(true)}
            className={styles.popover}
            style={{ top: notePos.top, left: notePos.left }}
          />
        )}
      </div>

      {showNote && narrow && (
        <DayNote
          ref={noteRef}
          date={selected}
          day={selectedDay}
          onClose={() => close(true)}
          className={styles.inline}
        />
      )}

      <ul className={styles.legend} aria-label="Legend">
        {LEGEND_ITEMS.map((item) => (
          <li key={item.state} className={styles.legendItem}>
            <span className={styles.legendMark}>
              <DayMark state={item.state} />
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Label of a day that opens a note; the weekday comes from the column
    header, so only the date is spoken here. */
function dayLabel(
  date: string,
  state: DayState,
  isToday: boolean,
  seconds: number
): string {
  const parts = [formatDayLabel(date)];
  if (isToday) parts.push("today");
  if (state === "studied")
    parts.push(`studied ${formatStudyTime(seconds, "today")}`);
  else if (state === "frozen") parts.push("freezer day");
  else if (state === "missed")
    parts.push(
      seconds > 0
        ? `missed, ${formatStudyTime(seconds, "today")} studied`
        : "missed"
    );
  return parts.join(", ");
}

/** The mark under a day's number. Decorative: the day's label says it. */
function DayMark({ state }: { state: DayState }) {
  if (state === "studied") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/ui/pressed-bloom.svg"
        alt=""
        aria-hidden="true"
        className={styles.bloom}
      />
    );
  }
  if (state === "frozen")
    return <GameIcon name="freezer" size={16} className={styles.feather} />;
  return <span className={styles.noMark} aria-hidden="true" />;
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
