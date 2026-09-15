/**
 * Conta com data sem hora (`"2026-09-15"`), sem passar pelo fuso do aparelho.
 *
 * `new Date("2026-09-15")` é lido como meia-noite UTC e, em fuso negativo, volta
 * um dia ao virar data local. Aqui a data é só calendário: a conta é feita em UTC
 * de ponta a ponta, e nunca encosta no fuso.
 */

const MS_PER_DAY = 86_400_000;

/**
 * @example addDays("2026-09-01", -1) // "2026-08-31"
 */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Dias de `from` até `to`; negativo quando `to` vem antes.
 *
 * @example daysBetween("2026-09-01", "2026-09-15") // 14
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/**
 * O dia da semana com segunda = 0 e domingo = 6, a ordem do calendário brasileiro.
 *
 * @example weekdayFromMonday("2026-09-14") // 0 (segunda)
 */
export function weekdayFromMonday(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * A data local do instante, no fuso do aparelho: é o dia em que a pessoa treinou.
 *
 * @example localDateOf(new Date(2026, 8, 15, 23, 30)) // "2026-09-15"
 */
export function localDateOf(instant: Date): string {
  const month = String(instant.getMonth() + 1).padStart(2, "0");
  const day = String(instant.getDate()).padStart(2, "0");
  return `${instant.getFullYear()}-${month}-${day}`;
}
