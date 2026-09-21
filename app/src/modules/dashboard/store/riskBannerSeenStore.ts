import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';
import type { SeenRiskSignal } from '../services/shouldShowRiskBanner';

interface RiskBannerSeenState {
  /** Por aluno, o último sinal de risco que já virou balão para este especialista. */
  porAluno: Record<string, SeenRiskSignal>;
  marcarVisto: (studentId: string, sinal: SeenRiskSignal) => void;
}

/**
 * O dedupe do balão de risco, guardado **só no aparelho** do especialista.
 *
 * Guarda só `kind` e `days` — nunca a frase do sinal — pela mesma razão que o
 * briefing não loga a inferência: é saúde de titular identificado. Ver
 * `docs/LGPD_COMPLIANCE.md`, "Nova superfície: balão in-app (issue #336)".
 *
 * @example
 * const { porAluno, marcarVisto } = useRiskBannerSeenStore.getState();
 */
export const useRiskBannerSeenStore = create<RiskBannerSeenState>()(
  persist(
    (set) => ({
      porAluno: {},
      marcarVisto: (studentId, sinal) =>
        set((state) => ({ porAluno: { ...state.porAluno, [studentId]: sinal } })),
    }),
    {
      name: 'balao-de-risco-vistos',
      storage: createJSONStorage(() => armazenamentoNoAparelho('balao-de-risco-vistos')),
    }
  )
);
