import { addDays, daysBetween } from "./dateOnly";

/**
 * O Modo Descanso (#376, A8): a pausa do plano. Enquanto dura, a meta, a
 * sequência e o check-in esperam; depois de uma pausa longa, a semana de
 * retorno começa mais leve. Provisório (CREF, ADR-0044).
 */

export interface RestPeriod {
  id: string;
  starts_on: string;
  /** O fim previsto; nulo é "não sei". */
  planned_until: string | null;
  /** O dia da volta; nulo enquanto descansa. */
  ended_on: string | null;
}

/** A pausa a partir da qual a volta pede uma semana mais leve. */
export const RETURN_AFTER_DAYS = 10;
export const RETURN_WEEK_DAYS = 7;
/** A carga da semana de retorno: 80% da de antes. */
export const RETURN_LOAD_FACTOR = 0.8;

/**
 * O dia em que a pausa acaba: a volta, ou o fim previsto que já passou. Sem
 * nenhum dos dois, ainda não acabou.
 *
 * @example restEnd({ starts_on: "2026-10-01", planned_until: "2026-10-07", ended_on: null, id }, "2026-10-10") // "2026-10-08"
 */
export function restEnd(rest: RestPeriod, today: string): string | null {
  if (rest.ended_on) return rest.ended_on;
  if (rest.planned_until && today > rest.planned_until) return addDays(rest.planned_until, 1);
  return null;
}

/**
 * A pausa que vale hoje, ou nula.
 *
 * @example restingNow(pausas, "2026-10-14")?.planned_until // "2026-10-21"
 */
export function restingNow(rests: readonly RestPeriod[], today: string): RestPeriod | null {
  return rests.find((rest) => rest.starts_on <= today && restEnd(rest, today) === null) ?? null;
}

/**
 * Os dias pausados, para a sequência não quebrar neles.
 *
 * @example pausedDays([{ starts_on: "2026-10-01", ended_on: "2026-10-04", … }], "2026-10-14") // {"2026-10-01", …, "2026-10-03"}
 */
export function pausedDays(rests: readonly RestPeriod[], today: string): Set<string> {
  const days = new Set<string>();
  for (const rest of rests) {
    const end = restEnd(rest, today) ?? addDays(today, 1);
    for (let day = rest.starts_on; day < end; day = addDays(day, 1)) days.add(day);
  }
  return days;
}

/**
 * A pausa longa que acabou há menos de uma semana: a semana de retorno, com
 * menos carga. Nula fora dela.
 *
 * @example returnWeekOf(pausas, "2026-10-14")?.id // a pausa de 12 dias que acabou ontem
 */
export function returnWeekOf(rests: readonly RestPeriod[], today: string): RestPeriod | null {
  return (
    rests.find((rest) => {
      const end = restEnd(rest, today);
      if (!end || daysBetween(rest.starts_on, end) < RETURN_AFTER_DAYS) return false;
      return today >= end && daysBetween(end, today) < RETURN_WEEK_DAYS;
    }) ?? null
  );
}
