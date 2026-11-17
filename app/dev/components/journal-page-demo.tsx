"use client";

import { useState } from "react";
import { CalendarView } from "@/components/journal-page/calendar-view";
import { EmptyPage } from "@/components/journal-page/empty-page";
import { JourneySummary } from "@/components/journal-page/journey-summary";
import { JournalSpread } from "@/components/journal/journal-spread";
import { LuggageTag } from "@/components/journal/luggage-tag";
import { PostageStamp } from "@/components/journal/postage-stamp";
import { XpSeedJar } from "@/components/journal/xp-seed-jar";
import {
  addMonths,
  compareMonths,
  type MonthKey,
} from "@/lib/statistics/calendar";
import type { MonthData } from "@/lib/statistics/use-month-data";
import styles from "./components.module.css";

/* Phase 4: the Journal's left page with mock data — a November with
   studied days, a freezer day, missed days (one with a little study below
   the threshold) and a to-do-only day, account created on Nov 3, today
   Nov 17. October is before the account (no paging back past it). */

const TODAY = "2026-11-17";
const FIRST_DATE = "2026-10-20";
const MIN_SECONDS = 15 * 60;

const d = (seconds: number, xp: number, todos = 0, frozen = false) => ({
  seconds,
  xp,
  todos,
  frozen,
});

const MOCK: Record<string, MonthData> = {
  "2026-10": {
    "2026-10-20": d(1800, 60, 1),
    "2026-10-21": d(2700, 90),
    "2026-10-23": d(1500, 50, 2),
    "2026-10-27": d(3600, 120, 1),
    "2026-10-28": d(1200, 40),
    "2026-10-30": d(900, 30),
  },
  "2026-11": {
    "2026-11-02": d(3900, 130, 3),
    "2026-11-03": d(1800, 60, 1),
    "2026-11-04": d(2400, 80),
    "2026-11-05": d(600, 20, 1), // studied, but below 15 min → missed
    "2026-11-07": d(0, 0, 0, true), // freezer kept the streak
    "2026-11-08": d(2100, 70, 2),
    "2026-11-09": d(5400, 180, 4),
    "2026-11-10": d(1500, 50),
    "2026-11-12": d(0, 0, 2), // only to-dos, no study → missed
    "2026-11-13": d(3000, 100, 1),
    "2026-11-14": d(1800, 60),
    "2026-11-15": d(2700, 90, 2),
    "2026-11-16": d(4200, 140, 1),
    "2026-11-17": d(1500, 50, 1),
  },
};

const monthKey = (m: MonthKey) =>
  `${m.year}-${String(m.month).padStart(2, "0")}`;

export function JournalPagePlate() {
  return (
    <p className={styles.note}>
      The Journal&apos;s left page with mock data (account since Oct 20, today
      Nov 17): streak label, Today / Total and the calendar. Pressed bloom =
      studied (≥ 15 min), feather = freezer day (Nov 7), dot = missed (Nov 1, 6,
      11; Nov 5 has only 10 min, Nov 12 only to-dos). Click or tab to a day for
      its note; Escape closes it. Below: the same book for a brand-new user
      (blank left page, Robin&apos;s note).
    </p>
  );
}

export function JournalPageStage() {
  const current: MonthKey = { year: 2026, month: 11 };
  const [month, setMonth] = useState<MonthKey>(current);

  return (
    <div className={styles.journalPageDemo}>
      <JournalSpread
        aria-label="Journal (mock)"
        left={
          <>
            <JourneySummary
              streak={10}
              todaySeconds={1500}
              totalSeconds={52 * 3600 + 25 * 60}
              streakMinMinutes={15}
              milestone={false}
            />
            <CalendarView
              month={month}
              data={MOCK[monthKey(month)] ?? {}}
              today={TODAY}
              firstDate={FIRST_DATE}
              minSeconds={MIN_SECONDS}
              canGoBack={compareMonths(month, { year: 2026, month: 10 }) > 0}
              canGoForward={compareMonths(month, current) < 0}
              onMonthChange={(delta) => setMonth((m) => addMonths(m, delta))}
            />
          </>
        }
        right={null}
      />
    </div>
  );
}

/** A brand-new user: nothing studied yet. The left page is blank with
    Robin's note; the right page keeps the jar, the next stop and the
    stamps (static here, the live page loads them), no weekly stamps. */
export function JournalEmptyStage() {
  return (
    <div className={styles.journalPageDemo}>
      <JournalSpread
        aria-label="Journal, empty (mock)"
        left={<EmptyPage streakMinMinutes={15} />}
        right={
          <section
            aria-label="The journey"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-5)",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "1.375rem",
              }}
            >
              The journey
            </h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "var(--space-5) var(--space-6)",
              }}
            >
              <XpSeedJar value={0} max={25} level={1} />
              <LuggageTag destination="Beach" unlockLevel={10} xpToGo={225} />
            </div>
            <div className={styles.journeyRow}>
              <PostageStamp
                place="The Garden"
                unlockLevel={1}
                establishedAt="2026-11-17T09:00:00Z"
                motif="/garden/items/rose-3.png"
              />
              <PostageStamp place="Beach" unlockLevel={10} />
            </div>
          </section>
        }
      />
    </div>
  );
}
