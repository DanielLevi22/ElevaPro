import { createNutritionService, createStudentsService, type MealLog } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { type AderenciaDaSemana, aderenciaDaSemana, semanaDe } from '../services/aderenciaDaSemana';
import { useNutritionStore } from '../store/nutritionStore';

const nutricao = createNutritionService(supabase);
const alunos = createStudentsService(supabase);

export interface AderenciaDoAluno extends AderenciaDaSemana {
  /** `YYYY-MM-DD` de segunda e de domingo. */
  inicio: string;
  fim: string;
  carregando: boolean;
  /** Última pesagem menos a anterior, em kg. `null` com menos de duas. */
  variacaoDePeso: number | null;
  /** O peso da única pesagem, quando não há anterior para comparar. */
  pesoAtual: number | null;
  notaDoEspecialista: string | null;
  especialistaId: string | null;
}

/**
 * A semana do aluno para a tela de aderência: as refeições feitas de segunda
 * a domingo, a média de calorias, o peso e a nota do plano.
 *
 * @example
 * const semana = useAderenciaDoAluno(user.id);
 */
export function useAderenciaDoAluno(alunoId: string): AderenciaDoAluno {
  const plano = useNutritionStore((s) => s.currentDietPlan);
  const refeicoes = useNutritionStore((s) => s.meals);
  const itensDoPlano = useNutritionStore((s) => s.mealItems);
  const hoje = getLocalDateISOString();
  const semana = semanaDe(hoje);
  const [registros, setRegistros] = useState<MealLog[]>([]);
  const [pesos, setPesos] = useState<(number | null)[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [dasemana, pesagens] = await Promise.all([
      nutricao.fetchMealLogsByRange(alunoId, semana[0], semana[6]).catch(() => []),
      alunos.fetchUltimasPesagens(alunoId, 2).catch(() => []),
      carregarPlano(alunoId),
    ]);
    setRegistros(dasemana);
    setPesos(pesagens.map((p) => p.weight_kg));
    setCarregando(false);
  }, [alunoId, semana[0], semana[6]]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const [ultimo, anterior] = pesos;
  return {
    ...aderenciaDaSemana({
      hoje,
      tipoDoPlano: plano?.plan_type,
      refeicoes,
      registros,
      itensDoPlano,
    }),
    inicio: semana[0],
    fim: semana[6],
    carregando,
    variacaoDePeso: ultimo != null && anterior != null ? ultimo - anterior : null,
    pesoAtual: ultimo ?? null,
    notaDoEspecialista: plano?.notes?.trim() || null,
    especialistaId: plano?.specialist_id ?? null,
  };
}

async function carregarPlano(alunoId: string): Promise<void> {
  const store = useNutritionStore.getState();
  await store.fetchDietPlan(alunoId);
  const plano = useNutritionStore.getState().currentDietPlan;
  if (plano) await store.fetchMeals(plano.id);
}
