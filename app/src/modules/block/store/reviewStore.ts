import type { BlockChanges, NextBlockPending } from '@elevapro/shared';
import { create } from 'zustand';

interface ReviewState {
  changes: BlockChanges;
  /** O próximo bloco que a B3 montou e a B5 mostra. */
  pending: NextBlockPending | null;
  setChanges: (changes: BlockChanges) => void;
  setPending: (pending: NextBlockPending | null) => void;
  reset: () => void;
}

/**
 * O caminho da reavaliação, de B2 a B5. Só na memória: a anamnese é dado de
 * saúde, e o que a pessoa marcou só sai do aparelho para montar o bloco.
 *
 * @example useReviewStore.getState().setChanges({ training_days: 4 });
 */
export const useReviewStore = create<ReviewState>((set) => ({
  changes: {},
  pending: null,
  setChanges: (changes) => set({ changes }),
  setPending: (pending) => set({ pending }),
  reset: () => set({ changes: {}, pending: null }),
}));
