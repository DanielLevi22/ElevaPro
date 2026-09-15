import { addDays, withinDays } from "./dateOnly";

/**
 * Um número medido num período, a diferença para o período anterior de mesmo
 * tamanho e a série das últimas semanas.
 *
 * Existe porque o hub (30 dias) e a nutrição em números (12 semanas) fazem a mesma
 * conta com medidas diferentes, e as duas não podem divergir no jeito de recortar
 * o período ou de tratar a semana sem dado.
 */
export interface Trend {
  value: number | null;
  /** Nula quando falta medida em um dos dois períodos. */
  delta: number | null;
  /** Oito semanas, da mais antiga à atual; `null` é semana sem o que medir. */
  spark: (number | null)[];
}

/** Como uma janela de dias vira um número; `null` é não haver o que medir. */
export type WindowMeasure<Item> = (items: readonly Item[]) => number | null;

const WEEK_DAYS = 7;
const SPARK_WEEKS = 8;

/**
 * Mede o período terminando hoje contra o anterior de mesmo tamanho.
 *
 * @example trendOver(days, "2026-09-15", 30, countWorkouts) // { value: 12, delta: 3, spark: [...] }
 */
export function trendOver<Item extends { date: string }>(
  items: readonly Item[],
  today: string,
  periodDays: number,
  measure: WindowMeasure<Item>,
): Trend {
  const value = measure(withinDays(items, today, periodDays));
  const previous = measure(withinDays(items, addDays(today, -periodDays), periodDays));
  const delta = value === null || previous === null ? null : value - previous;
  return { value, delta, spark: weeklyValues(items, today, SPARK_WEEKS, measure) };
}

/**
 * Mede semanas de sete dias terminando hoje, da mais antiga à atual, para o
 * gráfico que mostra uma barra ou um ponto por semana.
 *
 * @example weeklyValues(days, "2026-09-15", 12, mealAdherence) // [68, 74, null, …]
 */
export function weeklyValues<Item extends { date: string }>(
  items: readonly Item[],
  today: string,
  weeks: number,
  measure: WindowMeasure<Item>,
): (number | null)[] {
  return Array.from({ length: weeks }, (_, index) => {
    const end = addDays(today, -(weeks - 1 - index) * WEEK_DAYS);
    return measure(withinDays(items, end, WEEK_DAYS));
  });
}
