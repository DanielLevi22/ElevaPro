import {
  concluidosNaSemana,
  proximoTreino,
  type TrainingPlan,
  type Workout,
} from '@elevapro/shared';
import { useEffect, useMemo, useState } from 'react';
import { useWorkoutStore } from '../store/workoutStore';
import { useSessoesDoAluno } from './useSessoesDoAluno';

/**
 * Uma fase do aluno: os treinos dela, qual vem agora e quais já foram feitos
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
  /** Só depois de a busca voltar: antes dela, ausência é carregamento. */
  naoEncontrada: boolean;
  treinos: Workout[];
  carregandoTreinos: boolean;
  proximo: Workout | null;
  treinouHoje: boolean;
  feitos: Set<string>;
}

export function useTreinosDaFase(
  periodizacaoId: string,
  faseId: string,
  alunoId: string
): TreinosDaFase {
  const { fase, numeroDaFase, naoEncontrada } = useFaseDaLoja(periodizacaoId, faseId);
  const { treinos, carregandoTreinos } = useTreinosDaLista(faseId);
  const { ultima, daSemana } = useSessoesDoAluno(alunoId);

  return useMemo(() => {
    const agora = new Date();
    const sugestao = proximoTreino(treinos, ultima, agora);
    return {
      fase,
      numeroDaFase,
      naoEncontrada,
      treinos,
      carregandoTreinos,
      proximo: sugestao ? treinos[sugestao.indice] : null,
      treinouHoje: sugestao?.feitoHoje ?? false,
      feitos: concluidosNaSemana(daSemana, agora),
    };
  }, [fase, numeroDaFase, naoEncontrada, treinos, carregandoTreinos, ultima, daSemana]);
}

function useFaseDaLoja(periodizacaoId: string, faseId: string) {
  const { currentPeriodizationPhases: fases, fetchPeriodizationPhases } = useWorkoutStore();
  const indice = fases.findIndex((f) => f.id === faseId);
  const [buscou, setBuscou] = useState(indice !== -1);

  useEffect(() => {
    if (indice !== -1) return;
    fetchPeriodizationPhases(periodizacaoId).finally(() => setBuscou(true));
  }, [indice, periodizacaoId, fetchPeriodizationPhases]);

  return {
    fase: fases[indice] ?? null,
    numeroDaFase: indice + 1,
    naoEncontrada: buscou && indice === -1,
  };
}

function useTreinosDaLista(faseId: string): { treinos: Workout[]; carregandoTreinos: boolean } {
  const { workouts, fetchWorkoutsForPhase, isLoading } = useWorkoutStore();

  useEffect(() => {
    fetchWorkoutsForPhase(faseId);
  }, [faseId, fetchWorkoutsForPhase]);

  // A store guarda os treinos da última fase aberta: filtrar evita mostrar os
  // de outra fase no instante antes da busca voltar.
  const treinos = useMemo(
    () => workouts.filter((treino) => treino.training_plan_id === faseId),
    [workouts, faseId]
  );
  return { treinos, carregandoTreinos: isLoading && treinos.length === 0 };
}
