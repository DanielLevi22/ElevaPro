import type { DietMeal } from '@elevapro/shared';
import { useEffect, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { diaDaSemana } from '../services/aderenciaDaSemana';
import {
  type ItemDoPrato,
  itensDaRefeicao,
  MACROS_ZERADOS,
  type Macros,
  macrosDosItens,
  metaDoDia,
} from '../services/consumoDoDia';
import { refeicoesDoDia } from '../services/refeicoesDoDia';
import { useNutritionStore } from '../store/nutritionStore';
import { motivoParaNaoMarcar } from './usePlanoDoDia';

export interface RefeicaoAberta {
  refeicao: DietMeal | null;
  /** Buscou e não achou: refeição de outro plano, ou link velho. */
  naoEncontrada: boolean;
  itens: ItemDoPrato[];
  macros: Macros;
  /** A meta do dia inteiro: o percentual da refeição é sobre ela, como no kit. */
  metaDiaria: Macros;
  feita: boolean;
  marcar: () => void;
}

/**
 * Uma refeição do plano na data aberta: o que tem no prato, os macros e o check.
 *
 * Lê o que o plano do dia já carregou. Aberta por link, sem o plano na memória,
 * carrega plano, refeições e registros da data antes.
 *
 * @example
 * const aberta = useRefeicaoDoDia(user.id, refeicaoId, data, { somenteLeitura });
 */
export function useRefeicaoDoDia(
  alunoId: string,
  refeicaoId: string,
  data: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): RefeicaoAberta {
  const plano = useNutritionStore((s) => s.currentDietPlan);
  const refeicoes = useNutritionStore((s) => s.meals);
  const itensDoPlano = useNutritionStore((s) => s.mealItems);
  const registros = useNutritionStore((s) => s.dailyLogs);
  const refeicao = refeicoes.find((r) => r.id === refeicaoId) ?? null;
  const [buscou, setBuscou] = useState(refeicao !== null);

  useEffect(() => {
    if (buscou) return;
    carregarPlanoNaData(alunoId, data).finally(() => setBuscou(true));
  }, [alunoId, data, buscou]);

  const itens = itensDaRefeicao(registros[refeicaoId], itensDoPlano[refeicaoId]);
  const doDia = refeicoesDoDia(refeicoes, plano?.plan_type, diaDaSemana(data));
  const feita = registros[refeicaoId]?.completed ?? false;

  const marcar = () => {
    const aviso = motivoParaNaoMarcar(somenteLeitura, data, getLocalDateISOString());
    if (aviso) return showAlert(aviso);
    useNutritionStore.getState().toggleMealCompletion(refeicaoId, data, !feita);
  };

  return {
    refeicao,
    naoEncontrada: buscou && refeicao === null,
    itens,
    macros: macrosDosItens(itens),
    metaDiaria: plano ? metaDoDia(plano, doDia, itensDoPlano) : MACROS_ZERADOS,
    feita,
    marcar,
  };
}

async function carregarPlanoNaData(alunoId: string, data: string): Promise<void> {
  const store = useNutritionStore.getState();
  await store.fetchDietPlan(alunoId);
  const plano = useNutritionStore.getState().currentDietPlan;
  await Promise.all([
    plano ? store.fetchMeals(plano.id) : null,
    store.fetchDailyLogs(alunoId, data),
  ]);
}
