import { MESES_CURTOS } from "./calendario";

/**
 * Conta com data sem hora (`"2026-09-15"`), sem passar pelo fuso do aparelho.
 *
 * `new Date("2026-09-15")` é lido como meia-noite UTC e, em fuso negativo, volta
 * um dia ao virar data local. Aqui a data é só calendário: a conta é feita em UTC
 * de ponta a ponta, e nunca encosta no fuso.
 */

const MS_PER_DAY = 86_400_000;

/**
 * A data `days` dias depois, ou antes com negativo, atravessando mês e ano.
 *
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
 * O dia da semana com domingo = 0, como `getUTCDay` e como `diet_meals.day_of_week`.
 *
 * @example weekdayOf("2026-09-13") // 0 (domingo)
 */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * O mês curto como o kit escreve nos eixos dos gráficos.
 *
 * @example shortMonthOf("2026-09-15") // "set"
 */
export function shortMonthOf(date: string): string {
  return MESES_CURTOS[Number(date.slice(5, 7)) - 1];
}

/**
 * O dia da semana com segunda = 0 e domingo = 6, a ordem do calendário brasileiro.
 *
 * @example weekdayFromMonday("2026-09-14") // 0 (segunda)
 */
export function weekdayFromMonday(date: string): number {
  return (weekdayOf(date) + 6) % 7;
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

/**
 * A data como instante ao meio-dia local, para calendário e `toLocaleDateString`.
 *
 * Meia-noite seria arriscado: `new Date("2026-08-01")` é meia-noite UTC e
 * mostra 31/07 no Brasil. Ao meio-dia, nenhum fuso do país muda o dia.
 *
 * @example localNoonOf("2026-08-01").toLocaleDateString("pt-BR") // "01/08/2026"
 */
export function localNoonOf(date: string): Date {
  return new Date(`${date.slice(0, 10)}T12:00:00`);
}

/**
 * Os itens dos `length` dias terminando em `end`, inclusive.
 *
 * @example withinDays(days, "2026-09-15", 30) // de 17/08 a 15/09
 */
export function withinDays<Item extends { date: string }>(
  items: readonly Item[],
  end: string,
  length: number,
): Item[] {
  const start = addDays(end, -(length - 1));
  return items.filter((item) => item.date >= start && item.date <= end);
}

/**
 * Um intervalo como o kit escreve: "5 a 11 out", e o mês dos dois lados quando
 * vira o mês. A semana do relatório e o bloco usam o mesmo.
 *
 * @example shortDateRange("2026-09-28", "2026-10-04") // "28 set a 4 out"
 */
export function shortDateRange(start: string, end: string): string {
  const day = (date: string) => String(Number(date.slice(8, 10)));
  const sameMonth = start.slice(5, 7) === end.slice(5, 7);
  const from = sameMonth ? day(start) : `${day(start)} ${shortMonthOf(start)}`;
  return `${from} a ${day(end)} ${shortMonthOf(end)}`;
}

/**
 * A segunda-feira desta semana no fuso do Brasil, como `private.current_check_in_week`.
 *
 * @example currentWeekStart(new Date("2026-10-11T23:00:00-03:00")) // "2026-10-05"
 */
export function currentWeekStart(now: Date = new Date()): string {
  const brazil = toBrazilTime(now);
  const sinceMonday = (brazil.getUTCDay() + 6) % 7;
  brazil.setUTCDate(brazil.getUTCDate() - sinceMonday);
  return brazil.toISOString().slice(0, 10);
}

/**
 * Se o instante cai no mesmo dia, no Brasil, que agora: o "Desfazer" só vale no
 * dia do ajuste, a mesma regra de `undo_weekly_calorie_adjustment`.
 *
 * @example isTodayInBrazil(ajuste.approvedAt) // true no dia da aprovação
 */
export function isTodayInBrazil(instant: string, now: Date = new Date()): boolean {
  const day = (date: Date) => toBrazilTime(date).toISOString().slice(0, 10);
  return day(new Date(instant)) === day(now);
}

/**
 * Conta, e não `new Date(now.toLocaleString(...))`: o Hermes não lê data em
 * texto fora do ISO, a semana virava "NaN-NaN-NaN" e o cartão sumia no
 * aparelho com os testes passando no Node. O Brasil está em UTC−3 fixo desde
 * 2019, sem horário de verão.
 */
function toBrazilTime(instant: Date): Date {
  return new Date(instant.getTime() - BRAZIL_OFFSET_MS);
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

/** O dia de hoje no Brasil, como a pausa grava (`start_rest`). @example brazilToday() // "2026-10-14" */
export function brazilToday(): string {
  return toBrazilTime(new Date()).toISOString().slice(0, 10);
}
