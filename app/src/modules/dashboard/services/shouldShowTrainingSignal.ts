import type { TrainingSignal } from '@elevapro/shared';

/** O que o dedupe local precisa pra saber "já mostrei este plano". */
export interface SeenTrainingSignal {
  id: string;
  updatedAt: string;
}

export function toSeenTrainingSignal(signal: TrainingSignal): SeenTrainingSignal {
  return { id: signal.id, updatedAt: signal.updatedAt };
}

/**
 * Novo plano, ou o mesmo plano publicado de novo (o especialista reativou
 * a fase depois de editar) — as duas contam como "algo mudou".
 */
export function shouldShowTrainingSignal(
  current: SeenTrainingSignal | null,
  lastSeen: SeenTrainingSignal | null
): boolean {
  if (!current) return false;
  if (!lastSeen) return true;

  return current.id !== lastSeen.id || current.updatedAt !== lastSeen.updatedAt;
}
