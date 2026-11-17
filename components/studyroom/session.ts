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
  { id: "50_10", label: "50 / 10", description: "50 min study / 10 min break" },
  { id: "25_5", label: "25 / 5", description: "25 min study / 5 min break" },
  { id: "flexible", label: "Flexible", description: "Flexible" },
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
