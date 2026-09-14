import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const armazenamento = createMMKV({ id: 'refeicoes-favoritas' });

const noAparelho: StateStorage = {
  getItem: (nome) => armazenamento.getString(nome) ?? null,
  setItem: (nome, valor) => armazenamento.set(nome, valor),
  removeItem: (nome) => armazenamento.remove(nome),
};

interface FavoritosState {
  /** Por aluno, as refeições do plano marcadas com o coração. */
  porAluno: Record<string, string[]>;
  alternar: (alunoId: string, refeicaoId: string) => void;
}

/**
 * As refeições favoritas do aluno, guardadas **só no aparelho**.
 *
 * Decisão do `/lgpd-check` da #298: o favorito só alimenta a sugestão do
 * assistente, que parte do aparelho. Uma tabela guardaria preferência alimentar
 * associada ao plano de saúde, com RLS, exportação e eliminação, para uma
 * finalidade que o aparelho entrega sozinho. O custo aceito é o favorito não
 * acompanhar a troca de aparelho.
 *
 * Por aluno, e não global: o especialista que abre o app "como aluno" no
 * aparelho dele não herda o coração de ninguém.
 *
 * @example
 * const alternar = useFavoritosStore((s) => s.alternar);
 * alternar(user.id, refeicao.id);
 */
export const useFavoritosStore = create<FavoritosState>()(
  persist(
    (set) => ({
      porAluno: {},
      alternar: (alunoId, refeicaoId) =>
        set((state) => {
          const atuais = state.porAluno[alunoId] ?? [];
          const novos = atuais.includes(refeicaoId)
            ? atuais.filter((id) => id !== refeicaoId)
            : [...atuais, refeicaoId];
          return { porAluno: { ...state.porAluno, [alunoId]: novos } };
        }),
    }),
    { name: 'refeicoes-favoritas', storage: createJSONStorage(() => noAparelho) }
  )
);
