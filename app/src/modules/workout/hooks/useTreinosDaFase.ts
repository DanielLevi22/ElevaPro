import {
  concluidosNaSemana,
  createWorkoutsService,
  inicioDaSemanaISO,
  proximoTreino,
  type SessaoConcluida,
  type TrainingPlan,
  type Workout,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';

/**
 * A fase ativa do aluno: os treinos dela, qual vem agora e quais já foram feitos
 * na semana.
 *
 * As sessões são buscadas de novo a cada foco: o aluno volta a esta tela depois
 * de treinar, e o treino recém-feito precisa aparecer marcado e o destaque
 * precisa ter andado para o próximo.
 *
 * @example
 * const { fase, treinos, proximo, feitos } = useTreinosDaFase(cicloId, faseId, aluno.id);
 */
interface TreinosDaFase {
  fase: TrainingPlan | null;
  numeroDaFase: number;
  treinos: Workout[];
  proximo: { treino: Workout; feitoHoje: boolean } | null;
  feitos: Set<string>;
  carregando: boolean;
}

export function useTreinosDaFase(
  periodizacaoId: string,
  faseId: string,
  alunoId: string
): TreinosDaFase {
  const loja = useWorkoutStore();
  const { currentPeriodizationPhases: fases, workouts, fetchPeriodizationPhases } = loja;
  const { fetchWorkoutsForPhase } = loja;
  const indiceDaFase = fases.findIndex((f) => f.id === faseId);
  const { ultima, daSemana } = useSessoesDoAluno(alunoId);

  useEffect(() => {
    if (indiceDaFase === -1) fetchPeriodizationPhases(periodizacaoId);
  }, [indiceDaFase, periodizacaoId, fetchPeriodizationPhases]);

  useEffect(() => {
    fetchWorkoutsForPhase(faseId);
  }, [faseId, fetchWorkoutsForPhase]);

  // A store guarda os treinos da última fase aberta: filtrar evita mostrar os
  // de outra fase no instante antes da busca voltar.
  const treinos = useMemo(
    () => workouts.filter((treino) => treino.training_plan_id === faseId),
    [workouts, faseId]
  );

  return useMemo(() => {
    const agora = new Date();
    const sugestao = proximoTreino(treinos, ultima, agora);
    return {
      fase: fases[indiceDaFase] ?? null,
      numeroDaFase: indiceDaFase + 1,
      treinos,
      proximo: sugestao
        ? { treino: treinos[sugestao.indice], feitoHoje: sugestao.feitoHoje }
        : null,
      feitos: concluidosNaSemana(daSemana, agora),
      carregando: loja.isLoading,
    };
  }, [fases, indiceDaFase, treinos, ultima, daSemana, loja.isLoading]);
}

const servicoDeTreinos = createWorkoutsService(supabase);

/**
 * As sessões pelo serviço do `shared`, e não pela store: a store de treino
 * ainda consulta o Supabase direto nessas leituras (#292), e é a tela do
 * especialista que a usa até o lote do professor.
 */
function useSessoesDoAluno(alunoId: string) {
  const [ultima, setUltima] = useState<SessaoConcluida | null>(null);
  const [daSemana, setDaSemana] = useState<SessaoConcluida[]>([]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      Promise.all([
        servicoDeTreinos.fetchLastWorkoutSession(alunoId),
        servicoDeTreinos.fetchCompletedSessionsSince(alunoId, inicioDaSemanaISO(new Date())),
      ]).then(([ultimaSessao, sessoes]) => {
        if (!ativo) return;
        setUltima(ultimaSessao);
        setDaSemana(sessoes);
      });
      return () => {
        ativo = false;
      };
    }, [alunoId])
  );

  return { ultima, daSemana };
}
