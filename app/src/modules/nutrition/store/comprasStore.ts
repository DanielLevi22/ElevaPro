import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { armazenamentoNoAparelho } from '@/lib/armazenamentoNoAparelho';

interface ComprasState {
  /** Por lista (`planoId:dias`), as chaves dos itens já comprados. */
  marcados: Record<string, string[]>;
  alternar: (lista: string, item: string) => void;
  limpar: (lista: string) => void;
}

/**
 * O que o aluno já pôs no carrinho, guardado **só no aparelho**.
 *
 * É lembrete de mercado, e não dado de saúde: não vai ao servidor. Foi a
 * decisão do `/lgpd-check` da #298 — mandar ao banco criaria RLS, exportação e
 * eliminação para uma finalidade que o aparelho entrega sozinho.
 *
 * @example
 * const alternar = useComprasStore((s) => s.alternar);
 * alternar(`${plano.id}:7`, food.id);
 */
export const useComprasStore = create<ComprasState>()(
  persist(
    (set) => ({
      marcados: {},
      alternar: (lista, item) =>
        set((state) => {
          const atuais = state.marcados[lista] ?? [];
          const novos = atuais.includes(item)
            ? atuais.filter((i) => i !== item)
            : [...atuais, item];
          return { marcados: { ...state.marcados, [lista]: novos } };
        }),
      limpar: (lista) => set((state) => ({ marcados: { ...state.marcados, [lista]: [] } })),
    }),
    {
      name: 'compras-marcadas',
      storage: createJSONStorage(() => armazenamentoNoAparelho('lista-de-compras')),
    }
  )
);
