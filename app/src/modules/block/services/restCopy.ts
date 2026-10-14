import { addDays, type RestPeriod, restingNow, returnWeekOf, shortMonthOf } from '@elevapro/shared';

/** As durações do desenho A8; "Não sei" fica sem data e volta pelo botão. */
export const REST_DURATIONS = [
  { key: '3d', label: '3 dias', days: 3 },
  { key: '1w', label: '7 dias', days: 7 },
  { key: '2w', label: '14 dias', days: 14 },
  { key: 'open', label: 'Não sei', days: null },
] as const;

export type RestDuration = (typeof REST_DURATIONS)[number]['key'];

/**
 * O último dia da pausa, contando hoje; nulo é "não sei".
 *
 * @example restUntil('1w', '2026-10-14') // "2026-10-20"
 */
export function restUntil(duration: RestDuration, today: string): string | null {
  const days = REST_DURATIONS.find((option) => option.key === duration)?.days ?? null;
  return days === null ? null : addDays(today, days - 1);
}

/** "21 out", como o kit escreve uma data curta. */
export function shortDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${shortMonthOf(date)}`;
}

export type RestCardState =
  | { kind: 'resting'; rest: RestPeriod }
  | { kind: 'return'; rest: RestPeriod }
  | null;

/**
 * O que o Modo Descanso pede na tela inicial: a pausa em curso, ou a semana de
 * retorno até a pessoa abrir as boas-vindas (A8 Volta).
 *
 * @example restCardState(pausas, '2026-10-14', [])?.kind // "resting"
 */
export function restCardState(
  rests: readonly RestPeriod[],
  today: string,
  seenReturn: readonly string[]
): RestCardState {
  const resting = restingNow(rests, today);
  if (resting) return { kind: 'resting', rest: resting };
  const back = returnWeekOf(rests, today);
  if (back && !seenReturn.includes(back.id)) return { kind: 'return', rest: back };
  return null;
}

/**
 * A linha do cartão da pausa: até quando, ou sem data.
 *
 * @example restingTitle({ planned_until: '2026-10-21', … }) // "Até 21 out"
 */
export function restingTitle(rest: RestPeriod): string {
  return rest.planned_until ? `Até ${shortDate(rest.planned_until)}` : 'Sem data para voltar';
}
