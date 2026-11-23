// Shared types and small helpers of the Studyroom (page + its pieces).

export type PomodoroModeId = "50_10" | "25_5" | "flexible";

export type Phase = "idle" | "focus" | "break" | "complete";

export type ProfileSummary = {
  xp: number;
  coins: number;
};

export type World = {
  id: number;
  name: string;
  slug: string;
  unlock_level: number;
};

export const POMODORO_MODES: {
  id: PomodoroModeId;
  label: string;
  description: string;
}[] = [
  { id: "25_5", label: "25/5", description: "25 minutes focus, 5 minutes break" },
  { id: "50_10", label: "50/10", description: "50 minutes focus, 10 minutes break" },
  { id: "flexible", label: "Flexibel", description: "Flexible: set your own minutes" },
];

export function getModeMinutes(
  modeId: PomodoroModeId,
  customStudyMinutes: number,
  customBreakMinutes: number
): { studyMinutes: number; breakMinutes: number } {
  switch (modeId) {
    case "50_10":
      return { studyMinutes: 50, breakMinutes: 10 };
    case "25_5":
      return { studyMinutes: 25, breakMinutes: 5 };
    case "flexible":
      return {
        studyMinutes: customStudyMinutes,
        breakMinutes: customBreakMinutes,
      };
  }
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// The worlds table still has German names for two places ("Garten",
// "Berge"). The UI is English, so the name is taken from the slug.
const WORLD_NAMES: Record<string, string> = {
  garden: "Garden",
  beach: "Beach",
  mountains: "Mountains",
};

export function worldName(world: World): string {
  return WORLD_NAMES[world.slug] ?? world.name;
}

/** Robin's short lines for a break (signed "— R." by the RobinNote). The
    first is the quote the Studyroom always had. */
export const BREAK_QUOTES = [
  "Small steps every day add up to big results.",
  "Rest is part of growing.",
  "Even roses take a breather.",
  "Slow rain still fills the can.",
];

/** One short, personal line when a whole run is done. */
export const COMPLETE_NOTES = [
  "Lovely session. The roses noticed.",
  "A good stretch of work. The garden grew a little.",
  "Well done. I'll note it in the journal.",
];
