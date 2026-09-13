import type { Workout } from '@elevapro/shared';
import { useWorkoutStore } from '../store/workoutStore';

/**
 * Onde o treino está no plano: "Treino B", "Fase 2" e o objetivo da periodização —
 * os chips do pré-início e a linha de data do resumo.
 *
 * Lê só o que já está na store, sem buscar: quem chega à sessão pelo caminho do
 * kit passou pela fase, e ela carregou os treinos e as fases. Quem chega por
 * outro caminho vê a sessão sem os chips que faltarem — dizer "Fase 1" sem
 * saber seria inventar.
 *
 * @example
 * const { letra, fase, objetivo } = useContextoDoTreino(treino);
 */
interface ContextoDoTreino {
  letra: string | null;
  fase: string | null;
  objetivo: string | null;
}

const PRIMEIRA_LETRA = 65;

export function useContextoDoTreino(treino: Workout): ContextoDoTreino {
  const { workouts, currentPeriodizationPhases: fases, periodizations } = useWorkoutStore();

  const daFase = workouts.filter((w) => w.training_plan_id === treino.training_plan_id);
  const posicao = daFase.findIndex((w) => w.id === treino.id);
  const indiceDaFase = fases.findIndex((f) => f.id === treino.training_plan_id);
  const fase = fases[indiceDaFase];
  const periodizacao = periodizations.find((p) => p.id === fase?.periodization_id);

  return {
    letra: posicao === -1 ? null : `Treino ${String.fromCharCode(PRIMEIRA_LETRA + posicao)}`,
    fase: indiceDaFase === -1 ? null : `Fase ${indiceDaFase + 1}`,
    objetivo: periodizacao?.objective ?? null,
  };
}
