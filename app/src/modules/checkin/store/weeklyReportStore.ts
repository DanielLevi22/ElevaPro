import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

interface WeeklyReportState {
  /** A última semana aberta, por conta: a segunda-feira dela. */
  seenWeek: Record<string, string>;
  markSeen: (userId: string, weekStart: string) => void;
}

/**
 * Qual relatório a pessoa já abriu, para o cartão da tela inicial sair depois
 * de visto. Só no aparelho e só a data da semana: nada do relatório em si,
 * que é dado de saúde, fica guardado aqui.
 *
 * @example useWeeklyReportStore.getState().markSeen(user.id, '2026-10-05');
 */
export const useWeeklyReportStore = create<WeeklyReportState>()(
  persist(
    (set) => ({
      seenWeek: {},
      markSeen: (userId, weekStart) =>
        set((state) => ({ seenWeek: { ...state.seenWeek, [userId]: weekStart } })),
    }),
    {
      name: 'weekly-report',
      storage: createJSONStorage(() => armazenamentoNoAparelho('weekly-report')),
    }
  )
);
