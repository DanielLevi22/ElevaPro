import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';
import type { SeenTrainingSignal } from '../services/shouldShowTrainingSignal';

interface TrainingSignalSeenState {
  /** O último plano ativo que já virou balão neste aparelho. */
  lastSeen: SeenTrainingSignal | null;
  markSeen: (signal: SeenTrainingSignal) => void;
}

/**
 * O dedupe do aviso de plano novo, guardado **só no aparelho** do aluno —
 * mesmo padrão do `riskBannerSeenStore` do especialista, para o lado dele.
 *
 * @example
 * const { lastSeen, markSeen } = useTrainingSignalSeenStore.getState();
 */
export const useTrainingSignalSeenStore = create<TrainingSignalSeenState>()(
  persist(
    (set) => ({
      lastSeen: null,
      markSeen: (signal) => set({ lastSeen: signal }),
    }),
    {
      name: 'balao-de-plano-visto',
      storage: createJSONStorage(() => armazenamentoNoAparelho('balao-de-plano-visto')),
    }
  )
);
