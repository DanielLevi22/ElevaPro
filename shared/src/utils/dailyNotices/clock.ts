import { DEFAULT_WORKOUT_TIME, MIN_STARTS_TO_LEARN } from "./constants";

const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

/**
 * "HH:MM" em minutos desde a meia-noite; nulo se não for um horário.
 *
 * @example minutesOf("18:30") // 1110
 */
export function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;
  const minutes = Number(match[1]) * MINUTES_PER_HOUR + Number(match[2]);
  return minutes < MINUTES_PER_DAY ? minutes : null;
}

/**
 * Minutos em "HH:MM".
 *
 * @example timeOf(1110) // "18:30"
 */
export function timeOf(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  return `${String(hours).padStart(2, "0")}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;
}

/**
 * O horário de costume do treino (F2): a mediana dos inícios. Poucos inícios
 * não são costume, e vale o horário padrão.
 *
 * @example usualWorkoutMinutes([1080, 1110, 1140]) // 1110
 */
export function usualWorkoutMinutes(starts: readonly number[]): number {
  if (starts.length < MIN_STARTS_TO_LEARN) return minutesOf(DEFAULT_WORKOUT_TIME) ?? 0;
  const sorted = [...starts].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(median);
}

/**
 * Se o minuto cai no silêncio. O silêncio das 22:00 às 07:00 vira a meia-noite.
 *
 * @example inQuietHours(23 * 60, "22:00", "07:00") // true
 */
export function inQuietHours(minutes: number, start: string, end: string): boolean {
  const from = minutesOf(start);
  const until = minutesOf(end);
  if (from === null || until === null || from === until) return false;
  if (from < until) return minutes >= from && minutes < until;
  return minutes >= from || minutes < until;
}
