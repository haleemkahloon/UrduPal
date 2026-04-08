import type { UserProgress } from "./types";

export function shuffleInPlace<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatHearts(hearts: number): string {
  return "♥".repeat(hearts) + "♡".repeat(Math.max(0, 5 - hearts));
}

export function applyStreakForToday(progress: UserProgress): UserProgress {
  const today = new Date().toDateString();
  if (progress.lastDate === today) return progress;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const nextStreak =
    progress.lastDate === yesterday ? progress.streak + 1 : 1;
  return {
    ...progress,
    streak: nextStreak,
    lastDate: today,
  };
}

export function choiceLetter(i: number): string {
  return String.fromCharCode(65 + i);
}
