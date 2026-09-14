import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/**
 * Um armazenamento MMKV com nome próprio, no formato que o `persist` do Zustand
 * pede.
 *
 * Para o que fica **só no aparelho** de propósito — a marcação da lista de
 * compras, a refeição favorita. Cada uso ganha o seu `id`, e o dado de um não
 * se mistura com o de outro.
 *
 * @example
 * persist(criador, { name: 'compras', storage: createJSONStorage(() => armazenamentoNoAparelho('compras')) })
 */
export function armazenamentoNoAparelho(id: string): StateStorage {
  const mmkv = createMMKV({ id });
  return {
    getItem: (nome) => mmkv.getString(nome) ?? null,
    setItem: (nome, valor) => mmkv.set(nome, valor),
    removeItem: (nome) => mmkv.remove(nome),
  };
}
