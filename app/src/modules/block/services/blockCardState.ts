import { type BlockDates, blockWeek } from '@elevapro/shared';

export type BlockCardState = 'deload' | 'review' | 'stalled' | null;

export interface BlockCardSeen {
  deloadSeen: boolean;
  snoozedUntil: string | null;
  /** A semana da estagnação de 3 semanas, ou nula (#376). */
  stalledWeek: string | null;
  stallSeen: string | null;
}

/**
 * O que o bloco pede na tela inicial: o aviso da descarga, até ser aberto (A7),
 * a reavaliação depois do fim (B1), a menos que a pessoa tenha pedido para
 * lembrar depois, ou, no meio do bloco, a reavaliação antecipada pelo peso
 * parado há 3 semanas, até "Agora não".
 *
 * @example blockCardState(bloco, '2026-10-17', { deloadSeen: false, snoozedUntil: null, stalledWeek: null, stallSeen: null }) // 'review'
 */
export function blockCardState(
  block: BlockDates,
  today: string,
  seen: BlockCardSeen
): BlockCardState {
  const week = blockWeek(block, today);
  if (week.ended) return seen.snoozedUntil && today < seen.snoozedUntil ? null : 'review';
  if (week.deload && !seen.deloadSeen) return 'deload';
  return seen.stalledWeek && seen.stalledWeek !== seen.stallSeen ? 'stalled' : null;
}
