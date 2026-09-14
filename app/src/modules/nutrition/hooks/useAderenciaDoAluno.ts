import {
  type AguaDoDia,
  createHidratacao,
  createNutritionService,
  createStudentsService,
  type MealLog,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getLocalDateISOString } from '@/utils/dateUtils';
import { type AderenciaDaSemana, aderenciaDaSemana, semanaDe } from '../services/aderenciaDaSemana';
import { carregarPlanoDoAluno } from '../services/carregarPlanoDoAluno';
import { useNutritionStore } from '../store/nutritionStore';

const nutricao = createNutritionService(supabase);
const alunos = createStudentsService(supabase);
const agua = createHidratacao(supabase);

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
  /** A água dos dias com registro na semana, como o banco devolveu. */
  aguaDaSemana: AguaDoDia[];
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
  const { registros, pesos, aguaDaSemana, carregando } = useDadosDaSemana(
    alunoId,
    semana[0],
    semana[6]
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
    aguaDaSemana,
  };
}

/** Os registros, a água da semana e as duas últimas pesagens, recarregados ao voltar à tela. */
function useDadosDaSemana(alunoId: string, inicio: string, fim: string) {
  const [registros, setRegistros] = useState<MealLog[]>([]);
  const [pesos, setPesos] = useState<(number | null)[]>([]);
  const [aguaDaSemana, setAguaDaSemana] = useState<AguaDoDia[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [dasemana, pesagens, dias] = await Promise.all([
      nutricao.fetchMealLogsByRange(alunoId, inicio, fim).catch(() => []),
      alunos.fetchUltimasPesagens(alunoId, 2).catch(() => []),
      agua.lerIntervalo(alunoId, inicio, fim).catch(() => []),
      carregarPlanoDoAluno(alunoId),
    ]);
    setRegistros(dasemana);
    setPesos(pesagens.map((p) => p.weight_kg));
    setAguaDaSemana(dias);
    setCarregando(false);
  }, [alunoId, inicio, fim]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );
  return { registros, pesos, aguaDaSemana, carregando };
}
