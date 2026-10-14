import type { BlockChanges, NextBlockPending } from '@elevapro/shared';
import { create } from 'zustand';

/** A mudança que a pessoa escolheu em "Mudar meu plano" (C1). */
export type ChangeFocus = 'main_goal' | 'training_days' | 'gym_type' | 'injuries';

interface ReviewState {
  changes: BlockChanges;
  /** Trocar o plano antes do fim do bloco (C1, C2), e não a reavaliação do fim. */
  early: boolean;
  /** A pergunta que já abre como "Mudou". */
  focus: ChangeFocus | null;
  /** O próximo bloco que a B3 montou e a B5 mostra. */
  pending: NextBlockPending | null;
  setChanges: (changes: BlockChanges) => void;
  setPending: (pending: NextBlockPending | null) => void;
  /** Começa a reavaliação do fim do bloco, do zero. */
  reset: () => void;
  /** Começa a troca antes do fim, já com a mudança escolhida. */
  startEarly: (focus: ChangeFocus) => void;
}

const EMPTY = { changes: {}, early: false, focus: null, pending: null };

/**
 * O caminho da reavaliação, de B2 a B5, e o da troca antes do fim (C1, C2).
 * Só na memória: a anamnese é dado de saúde, e o que a pessoa marcou só sai do
 * aparelho para montar o bloco.
 *
 * @example useReviewStore.getState().startEarly('gym_type');
 */
export const useReviewStore = create<ReviewState>((set) => ({
  ...EMPTY,
  setChanges: (changes) => set({ changes }),
  setPending: (pending) => set({ pending }),
  reset: () => set(EMPTY),
  startEarly: (focus) => set({ ...EMPTY, early: true, focus }),
}));
