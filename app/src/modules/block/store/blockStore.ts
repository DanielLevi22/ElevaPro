import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

interface BlockState {
  /** Os blocos cuja semana de descarga a pessoa já viu, pelo id da periodização. */
  deloadSeen: string[];
  markDeloadSeen: (blockId: string) => void;
  /** "Lembrar amanhã" da reavaliação: até que dia o cartão espera, por bloco. */
  reviewSnoozedUntil: Record<string, string>;
  snoozeReview: (blockId: string, until: string) => void;
  /** As voltas do Modo Descanso cujas boas-vindas a pessoa já abriu, pelo id da pausa. */
  returnSeen: string[];
  markReturnSeen: (restId: string) => void;
  /** "Agora não" da estagnação: a semana do check-in que a fechou. Um novo muda o quadro. */
  stallSeen: string | null;
  markStallSeen: (week: string) => void;
}

/**
 * O aviso da descarga aparece uma vez por bloco (#376, A7), e a reavaliação
 * pode esperar até amanhã (B1). Só no aparelho, e só o id do bloco e a data.
 *
 * @example useBlockStore.getState().markDeloadSeen(block.id);
 */
export const useBlockStore = create<BlockState>()(
  persist(
    (set) => ({
      deloadSeen: [],
      reviewSnoozedUntil: {},
      returnSeen: [],
      stallSeen: null,
      markStallSeen: (week) => set({ stallSeen: week }),
      markReturnSeen: (restId) =>
        set((state) =>
          state.returnSeen.includes(restId) ? state : { returnSeen: [...state.returnSeen, restId] }
        ),
      snoozeReview: (blockId, until) =>
        set((state) => ({ reviewSnoozedUntil: { ...state.reviewSnoozedUntil, [blockId]: until } })),
      markDeloadSeen: (blockId) =>
        set((state) =>
          state.deloadSeen.includes(blockId)
            ? state
            : { deloadSeen: [...state.deloadSeen, blockId] }
        ),
    }),
    { name: 'block', storage: createJSONStorage(() => armazenamentoNoAparelho('block')) }
  )
);
