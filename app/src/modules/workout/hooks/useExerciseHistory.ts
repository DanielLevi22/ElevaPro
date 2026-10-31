import { createWorkoutsService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import type { ExerciseHistory } from '../services/sessionLoadSuggestions';

const workoutsService = createWorkoutsService(supabase);
const EMPTY: ExerciseHistory = {};

/**
 * A carga e o esforço de cada exercício nas últimas sessões do treino, para a
 * carga sugerida (#376). Desligado fora do treino do próprio Praticante: no
 * treino prescrito, a carga é do especialista.
 *
 * Como a última sessão, sem invalidar ao gravar: o resumo soma a sessão de
 * hoje por conta própria, e relê-la daqui a contaria duas vezes.
 *
 * @example const historico = useExerciseHistory(treino.id, aluno.id, praticante);
 */
export function useExerciseHistory(
  workoutId: string,
  studentId: string,
  enabled: boolean
): ExerciseHistory {
  const { data } = useQuery({
    queryKey: ['exerciseHistory', workoutId, studentId],
    queryFn: () =>
      avisandoSeFalhar('sessao.lerHistoricoDeCarga', () =>
        workoutsService.fetchExerciseHistory(workoutId, studentId)
      ),
    enabled,
    staleTime: 0,
  });
  return data ?? EMPTY;
}
