import { type BlockDates, blockWeek } from '@elevapro/shared';

export type BlockCardState = 'deload' | 'review' | null;

/**
 * O que o bloco pede na tela inicial: o aviso da descarga, até ser aberto (A7),
 * ou a reavaliação depois do fim (B1), a menos que a pessoa tenha pedido para
 * lembrar depois.
 *
 * @example blockCardState(bloco, '2026-10-17', { deloadSeen: false, snoozedUntil: null }) // 'review'
 */
export function blockCardState(
  block: BlockDates,
  today: string,
  seen: { deloadSeen: boolean; snoozedUntil: string | null }
): BlockCardState {
  const week = blockWeek(block, today);
  if (week.ended) return seen.snoozedUntil && today < seen.snoozedUntil ? null : 'review';
  if (week.deload && !seen.deloadSeen) return 'deload';
  return null;
}
