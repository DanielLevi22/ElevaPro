import type { DietMeal, DietMealItem, MealLog } from '@elevapro/shared';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { showAlert } from '@/components/ui/appAlert';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { diaDaSemana } from '../services/aderenciaDaSemana';
import { carregarPlanoDoAluno } from '../services/carregarPlanoDoAluno';
import {
  consumoDoDia,
  itensDaRefeicao,
  MACROS_ZERADOS,
  type Macros,
  macrosDosItens,
  metaDoDia,
} from '../services/consumoDoDia';
import { refeicoesDoDia } from '../services/refeicoesDoDia';
import { useNutritionStore } from '../store/nutritionStore';

/** Uma refeição do dia pronta para a linha: o que comeu, ou o que o plano manda. */
export interface RefeicaoDoDia {
  refeicao: DietMeal;
  resumo: string;
  calorias: number;
  feita: boolean;
}

export interface PlanoDoDia {
  nomeDoPlano: string | null;
  temPlano: boolean;
  carregando: boolean;
  /** Só o puxar-para-atualizar: a volta à aba recarrega sem girar o indicador. */
  puxando: boolean;
  hoje: string;
  data: string;
  escolherData: (data: string) => void;
  refeicoes: RefeicaoDoDia[];
  consumo: Macros;
  meta: Macros;
  recarregar: () => void;
  puxarParaAtualizar: () => void;
  marcar: (refeicaoId: string) => void;
}

/**
 * O plano do dia do aluno: refeições da data escolhida, o que ele comeu e a
 * meta, e o check de feita.
 *
 * @example
 * const plano = usePlanoDoDia(user.id, { somenteLeitura: isMasquerading });
 */
export function usePlanoDoDia(
  alunoId: string,
  { somenteLeitura }: { somenteLeitura: boolean }
): PlanoDoDia {
  const plano = useNutritionStore((s) => s.currentDietPlan);
  const refeicoes = useNutritionStore((s) => s.meals);
  const itens = useNutritionStore((s) => s.mealItems);
  const registros = useNutritionStore((s) => s.dailyLogs);
  const hoje = getLocalDateISOString();
  const [data, setData] = useState(hoje);
  const [carregando, setCarregando] = useState(true);
  const [puxando, setPuxando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    await carregarPlanoDoAluno(alunoId, data);
    setCarregando(false);
  }, [alunoId, data]);

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  const doDia = [...refeicoesDoDia(refeicoes, plano?.plan_type, diaDaSemana(data))].sort(
    (a, b) => (a.meal_order ?? 0) - (b.meal_order ?? 0)
  );

  const puxarParaAtualizar = async () => {
    setPuxando(true);
    await recarregar();
    setPuxando(false);
  };

  const marcar = (refeicaoId: string) => {
    const aviso = motivoParaNaoMarcar(somenteLeitura, data, hoje);
    if (aviso) return showAlert(aviso);
    const feita = registros[refeicaoId]?.completed ?? false;
    useNutritionStore.getState().toggleMealCompletion(refeicaoId, data, !feita);
  };

  return {
    nomeDoPlano: plano?.name ?? null,
    temPlano: plano !== null,
    carregando,
    puxando,
    hoje,
    data,
    escolherData: setData,
    refeicoes: doDia.map((refeicao) => linhaDaRefeicao(refeicao, registros, itens)),
    consumo: consumoDoDia(doDia, registros, itens),
    meta: plano ? metaDoDia(plano, doDia, itens) : MACROS_ZERADOS,
    recarregar,
    puxarParaAtualizar,
    marcar,
  };
}

function linhaDaRefeicao(
  refeicao: DietMeal,
  registros: Record<string, MealLog>,
  itens: Record<string, DietMealItem[]>
): RefeicaoDoDia {
  const doPrato = itensDaRefeicao(registros[refeicao.id], itens[refeicao.id]);
  return {
    refeicao,
    resumo: doPrato
      .map((item) => item.food?.name)
      .filter(Boolean)
      .join(', '),
    calorias: Math.round(macrosDosItens(doPrato).calorias),
    feita: registros[refeicao.id]?.completed ?? false,
  };
}

/**
 * Por que o check não vale agora, ou `null` quando vale.
 *
 * O especialista vendo como aluno só lê. E dia que ainda não chegou não se
 * marca: o registro é do que o aluno comeu, não do que pretende comer.
 */
/** O especialista vendo como o aluno só lê: o aviso é o mesmo em toda escrita. */
export const AVISO_DE_MODO_LEITURA = {
  title: 'Modo leitura',
  message: 'Você está vendo como o aluno. Não dá para registrar por ele.',
};

export function motivoParaNaoMarcar(somenteLeitura: boolean, data: string, hoje: string) {
  if (somenteLeitura) return AVISO_DE_MODO_LEITURA;
  if (data > hoje) {
    return {
      title: 'Ainda não',
      message: 'Só dá para marcar refeição de hoje ou de dias que já passaram.',
      type: 'warning' as const,
    };
  }
  return null;
}
