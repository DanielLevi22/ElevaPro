import { addDays, daysBetween } from "./dateOnly";

/**
 * O ciclo do bloco do Praticante (#376): 4 semanas, e a última é de descarga —
 * metade das séries, a mesma carga, para o corpo recuperar antes do próximo
 * bloco. Provisório, como as faixas do onboarding: espera a validação do CREF
 * (ADR-0044).
 */

/** Só o que a conta precisa da periodização. */
export interface BlockDates {
  start_date: string;
  end_date: string;
}

export interface BlockWeek {
  /** De 1 ao total; 0 antes do início. */
  week: number;
  total: number;
  /** A última semana de um bloco de 4 ou mais. */
  deload: boolean;
  /** O bloco acabou: hora da reavaliação. */
  ended: boolean;
}

const WEEK_DAYS = 7;
/** Bloco mais curto que isto não tem descarga: não houve volume para recuperar. */
const DELOAD_MIN_WEEKS = 4;

/**
 * Em que semana do bloco a pessoa está hoje.
 *
 * @example blockWeek({ start_date: "2026-10-01", end_date: "2026-10-29" }, "2026-10-23")
 * // { week: 4, total: 4, deload: true, ended: false }
 */
export function blockWeek(block: BlockDates, today: string): BlockWeek {
  const total = Math.max(1, Math.round(daysBetween(block.start_date, block.end_date) / WEEK_DAYS));
  const elapsed = daysBetween(block.start_date, today);
  const ended = today >= block.end_date;
  if (elapsed < 0) return { week: 0, total, deload: false, ended: false };
  const week = Math.min(total, Math.floor(elapsed / WEEK_DAYS) + 1);
  return { week, total, deload: !ended && total >= DELOAD_MIN_WEEKS && week === total, ended };
}

/**
 * As séries da semana de descarga: a metade, arredondada para cima, e nunca
 * menos de uma. Provisório (CREF).
 *
 * @example deloadSets(3) // 2
 */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.ceil(sets / 2));
}

/**
 * O primeiro dia da semana de descarga, para o aviso saber quando é novidade.
 *
 * @example deloadStart({ start_date: "2026-10-01", end_date: "2026-10-29" }) // "2026-10-22"
 */
export function deloadStart(block: BlockDates): string {
  return addDays(block.end_date, -WEEK_DAYS);
}
