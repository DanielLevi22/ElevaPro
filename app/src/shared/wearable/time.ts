import type { TimeRange } from './types';

export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Os últimos `days` dias até `now`.
 *
 * @example
 * lastDays(new Date('2026-09-14T12:00:00Z'), 7); // de 07/09 12h até 14/09 12h
 */
export function lastDays(now: Date, days: number): TimeRange {
  return { start: new Date(now.getTime() - days * DAY_MS), end: now };
}

/**
 * Minutos entre dois instantes em milissegundos.
 *
 * @example
 * minutesBetween(range.start.getTime(), range.end.getTime());
 */
export function minutesBetween(startMs: number, endMs: number): number {
  return (endMs - startMs) / MINUTE_MS;
}
