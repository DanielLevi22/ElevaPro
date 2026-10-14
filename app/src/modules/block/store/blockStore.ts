import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

interface BlockState {
  /** Os blocos cuja semana de descarga a pessoa já viu, pelo id da periodização. */
  deloadSeen: string[];
  markDeloadSeen: (blockId: string) => void;
}

/**
 * O aviso da descarga aparece uma vez por bloco (#376, A7). Só no aparelho, e
 * só o id do bloco.
 *
 * @example useBlockStore.getState().markDeloadSeen(block.id);
 */
export const useBlockStore = create<BlockState>()(
  persist(
    (set) => ({
      deloadSeen: [],
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
