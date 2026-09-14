import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';
import type { SugestoesDoDiaGuardadas } from '../services/sugestoesDoDia';

interface SugestoesState {
  /** Por aluno, só as sugestões do último dia pedido. */
  porAluno: Record<string, SugestoesDoDiaGuardadas>;
  guardar: (alunoId: string, guardadas: SugestoesDoDiaGuardadas) => void;
}

/**
 * As "Sugestões do assistente" da busca, guardadas **só no aparelho** até o dia
 * virar (issue #298).
 *
 * Voltar à busca não chama a IA de novo: a chamada custa, e a sugestão do
 * almoço serve à tarde. Guarda um dia por aluno, e o dia novo sobrescreve o
 * velho, então nada se acumula.
 *
 * @example
 * useSugestoesStore.getState().guardar(user.id, { dia: plano.hoje, sugestoes });
 */
export const useSugestoesStore = create<SugestoesState>()(
  persist(
    (set) => ({
      porAluno: {},
      guardar: (alunoId, guardadas) =>
        set((state) => ({ porAluno: { ...state.porAluno, [alunoId]: guardadas } })),
    }),
    {
      name: 'sugestoes-do-dia',
      storage: createJSONStorage(() => armazenamentoNoAparelho('sugestoes-do-dia')),
    }
  )
);
