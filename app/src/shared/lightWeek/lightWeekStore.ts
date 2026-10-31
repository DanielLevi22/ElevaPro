import { addDays } from '@elevapro/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

/** Uma semana: a mesma da volta do Modo Descanso. */
const LIGHT_WEEK_DAYS = 7;

interface LightWeekState {
  /** O último dia da semana leve; nulo sem ela. */
  until: string | null;
  start: (today: string) => void;
}

/**
 * "Voltar com semana leve" (#376, F5): sete dias com as cargas da semana de
 * retorno, sem precisar pausar antes. Só no aparelho.
 *
 * @example useLightWeekStore.getState().start(hoje);
 */
export const useLightWeekStore = create<LightWeekState>()(
  persist(
    (set) => ({
      until: null,
      start: (today) => set({ until: addDays(today, LIGHT_WEEK_DAYS - 1) }),
    }),
    {
      name: 'light-week',
      storage: createJSONStorage(() => armazenamentoNoAparelho('light-week')),
    }
  )
);

/**
 * Se hoje está na semana leve.
 *
 * @example const leve = useLightWeek(hoje);
 */
export function useLightWeek(today: string): boolean {
  const until = useLightWeekStore((state) => state.until);
  return until !== null && today <= until;
}
