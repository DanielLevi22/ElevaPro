import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { carregarPlanoDoAluno } from '../services/carregarPlanoDoAluno';
import { type GrupoDeCompras, listaDeCompras } from '../services/listaDeCompras';
import { useComprasStore } from '../store/comprasStore';
import { useNutritionStore } from '../store/nutritionStore';

/** Os períodos do kit. */
export const PERIODOS = [7, 14, 30] as const;
export type Periodo = (typeof PERIODOS)[number];

const SEM_MARCADOS: string[] = [];

export interface ListaDoAluno {
  temPlano: boolean;
  dias: Periodo;
  escolherDias: (dias: Periodo) => void;
  grupos: GrupoDeCompras[];
  total: number;
  comprados: Set<string>;
  alternar: (chave: string) => void;
  limpar: () => void;
  compartilhar: () => void;
}

/**
 * A lista de compras do plano do aluno no período, com o que já foi comprado.
 *
 * @example
 * const lista = useListaDeCompras(user.id);
 */
export function useListaDeCompras(alunoId: string): ListaDoAluno {
  const plano = useNutritionStore((s) => s.currentDietPlan);
  const refeicoes = useNutritionStore((s) => s.meals);
  const itensDoPlano = useNutritionStore((s) => s.mealItems);
  const [dias, setDias] = useState<Periodo>(7);
  const chaveDaLista = `${plano?.id ?? 'sem-plano'}:${dias}`;
  const marcados = useComprasStore((s) => s.marcados[chaveDaLista] ?? SEM_MARCADOS);

  useFocusEffect(
    useCallback(() => {
      carregarPlanoDoAluno(alunoId);
    }, [alunoId])
  );

  const grupos = listaDeCompras({ tipoDoPlano: plano?.plan_type, refeicoes, itensDoPlano, dias });
  const comprados = new Set(marcados);

  return {
    temPlano: plano !== null,
    dias,
    escolherDias: setDias,
    grupos,
    total: grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0),
    comprados,
    alternar: (chave) => useComprasStore.getState().alternar(chaveDaLista, chave),
    limpar: () => useComprasStore.getState().limpar(chaveDaLista),
    compartilhar: () => Share.share({ message: textoDaLista(grupos, comprados, dias) }),
  };
}

/** O texto que vai para o WhatsApp: grupos em negrito e o que já foi comprado marcado. */
function textoDaLista(grupos: GrupoDeCompras[], comprados: Set<string>, dias: number): string {
  const corpo = grupos
    .map((grupo) => {
      const linhas = grupo.itens.map(
        (item) => `${comprados.has(item.chave) ? '[x]' : '[ ]'} ${item.nome} — ${item.quantidade}`
      );
      return `*${grupo.rotulo}*\n${linhas.join('\n')}`;
    })
    .join('\n\n');
  return `Lista de compras (${dias} dias)\n\n${corpo}`;
}
