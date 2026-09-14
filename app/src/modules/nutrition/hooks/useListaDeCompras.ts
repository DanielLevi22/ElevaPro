import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share } from 'react-native';
import { carregarPlanoDoAluno } from '../services/carregarPlanoDoAluno';
import { type GrupoDeCompras, listaDeCompras } from '../services/listaDeCompras';
import { estimarPrecoUmaVez, pedidoDoPreco, textoDoPreco } from '../services/precoDaLista';
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
  /** "≈ R$ 284", ou `null` enquanto não há estimativa. */
  preco: string | null;
  comprados: Set<string>;
  alternar: (chave: string) => void;
  limpar: () => void;
  compartilhar: () => void;
}

/**
 * A lista de compras do plano do aluno no período, com o que já foi comprado.
 *
 * @example
 * const lista = useListaDeCompras(user.id, { obterToken: () => token });
 */
export function useListaDeCompras(
  alunoId: string,
  { obterToken }: { obterToken: () => string }
): ListaDoAluno {
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
  const preco = usePrecoDaLista(grupos, obterToken);

  return {
    temPlano: plano !== null,
    dias,
    escolherDias: setDias,
    grupos,
    total: grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0),
    preco,
    comprados,
    alternar: (chave) => useComprasStore.getState().alternar(chaveDaLista, chave),
    limpar: () => useComprasStore.getState().limpar(chaveDaLista),
    compartilhar: () => Share.share({ message: textoDaLista(grupos, comprados, dias) }),
  };
}

/**
 * O preço da lista, estimado pelo assistente quando a lista muda. Sem
 * estimativa fica sem preço, e não "R$ 0": a lista não depende dele.
 */
function usePrecoDaLista(grupos: GrupoDeCompras[], obterToken: () => string): string | null {
  const assinatura = JSON.stringify(pedidoDoPreco(grupos));
  const [precos, setPrecos] = useState<Record<string, number | null>>({});
  // `grupos` é recalculado a cada render: quem dispara o pedido é a assinatura,
  // e o pedido lê a lista da hora por aqui.
  const atual = useRef({ grupos, obterToken });
  atual.current = { grupos, obterToken };

  useEffect(() => {
    const { grupos: lista, obterToken: token } = atual.current;
    if (lista.length === 0) return;
    let ativo = true;
    estimarPrecoUmaVez(lista, token()).then(
      (total) => ativo && setPrecos((antes) => ({ ...antes, [assinatura]: total }))
    );
    return () => {
      ativo = false;
    };
  }, [assinatura]);

  return textoDoPreco(precos[assinatura] ?? null);
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
