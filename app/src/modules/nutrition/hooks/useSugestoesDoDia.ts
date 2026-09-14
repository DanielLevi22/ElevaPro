import type { SugestaoDeRefeicao } from '@elevapro/shared';
import { useEffect, useRef } from 'react';
import {
  buscarSugestoesDoDia,
  faltamNoDia,
  nomesDasFavoritas,
  sugestoesGuardadas,
} from '../services/sugestoesDoDia';
import { useFavoritosStore } from '../store/favoritosStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useSugestoesStore } from '../store/sugestoesStore';
import type { PlanoDoDia } from './usePlanoDoDia';

interface OpcoesDasSugestoes {
  somenteLeitura: boolean;
  obterToken: () => string;
}

const NENHUMA: SugestaoDeRefeicao[] = [];

/**
 * As duas "Sugestões do assistente" da busca, pedidas uma vez por dia.
 *
 * Sem plano não há o que falta, e o especialista vendo como aluno não pede: a
 * rota é do aluno, com o consentimento dele. Falha deixa a lista vazia, e a
 * seção some — a busca não depende dela.
 *
 * @example
 * const sugestoes = useSugestoesDoDia(user.id, busca.registro.plano, { somenteLeitura, obterToken });
 */
export function useSugestoesDoDia(
  alunoId: string,
  plano: PlanoDoDia,
  { somenteLeitura, obterToken }: OpcoesDasSugestoes
): SugestaoDeRefeicao[] {
  const guardadas = useSugestoesStore((s) => sugestoesGuardadas(s.porAluno[alunoId], plano.hoje));
  const refeicoes = useNutritionStore((s) => s.meals);
  const favoritas = useFavoritosStore((s) => s.porAluno[alunoId]);
  // Um pedido por aluno e dia, mesmo com o plano recarregando no meio.
  const pedido = useRef<string | null>(null);
  const podePedir = plano.temPlano && !plano.carregando && !somenteLeitura && !guardadas;

  useEffect(() => {
    const chave = `${alunoId}:${plano.hoje}`;
    if (!podePedir || pedido.current === chave) return;
    pedido.current = chave;
    const nomes = nomesDasFavoritas(refeicoes, favoritas ?? []);
    buscarSugestoesDoDia(faltamNoDia(plano.meta, plano.consumo), nomes, obterToken())
      .then((sugestoes) => {
        // Resposta ilegível volta vazia: guardada, esconderia a seção o dia todo.
        if (sugestoes.length > 0) {
          useSugestoesStore.getState().guardar(alunoId, { dia: plano.hoje, sugestoes });
        }
      })
      .catch(() => undefined);
  }, [podePedir, alunoId, plano, refeicoes, favoritas, obterToken]);

  return guardadas ?? NENHUMA;
}
