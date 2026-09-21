import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';
import type { SeenRiskSignal } from '../services/shouldShowRiskBanner';

interface RiskBannerSeenState {
  /** Por aluno, o último sinal de risco que já virou balão para este especialista. */
  byStudentId: Record<string, SeenRiskSignal>;
  markSeen: (studentId: string, signal: SeenRiskSignal) => void;
}

/**
 * O dedupe do balão de risco, guardado **só no aparelho** do especialista.
 *
 * Guarda só `kind` e `days` — nunca a frase do sinal — pela mesma razão que o
 * briefing não loga a inferência: é saúde de titular identificado. Ver
 * `docs/LGPD_COMPLIANCE.md`, "Nova superfície: balão in-app (issue #336)".
 *
 * @example
 * const { byStudentId, markSeen } = useRiskBannerSeenStore.getState();
 */
export const useRiskBannerSeenStore = create<RiskBannerSeenState>()(
  persist(
    (set) => ({
      byStudentId: {},
      markSeen: (studentId, signal) =>
        set((state) => ({ byStudentId: { ...state.byStudentId, [studentId]: signal } })),
    }),
    {
      name: 'balao-de-risco-vistos',
      storage: createJSONStorage(() => armazenamentoNoAparelho('balao-de-risco-vistos')),
    }
  )
);
