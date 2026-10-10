import {
  createExerciseSwapService,
  type Exercise,
  type ExerciseSwapScope,
  type SwapContext,
  type Workout,
  type WorkoutExercise,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useEffect, useState } from 'react';

const swapService = createExerciseSwapService(supabase);

/**
 * Treino do próprio Praticante, sem especialista: é onde a troca pode ser de
 * vez. A mesma regra que o banco confere em `swap_workout_exercise` (0085).
 *
 * @example isSelfGuidedWorkout(treino, user.id) // false num treino prescrito
 */
export function isSelfGuidedWorkout(
  workout: Pick<Workout, 'specialist_id' | 'student_id'>,
  studentId: string
): boolean {
  return workout.specialist_id === null && workout.student_id === studentId;
}

interface ExerciseSwapState {
  alternatives: Exercise[];
  context: SwapContext | null;
  loading: boolean;
  failed: boolean;
}

const EMPTY: ExerciseSwapState = { alternatives: [], context: null, loading: false, failed: false };

/**
 * As alternativas ao exercício aberto na folha "Trocar exercício", e o que cada
 * modo grava.
 *
 * Em treino prescrito (Aluno), a troca é só de hoje e fica registrada para o
 * especialista ver: sem o registro, a troca não acontece. No treino do
 * Praticante, "só hoje" não grava nada; "sempre" troca no plano; "recomendar
 * menos" troca no plano e guarda o exercício para a montagem do plano evitar.
 *
 * @example const { alternatives, persist } = useExerciseSwap(item, alunoId);
 */
export function useExerciseSwap(item: WorkoutExercise | null, studentId: string) {
  const state = useAlternatives(item?.exercise ?? null, studentId);
  const persist = (
    mode: ExerciseSwapScope,
    swapped: WorkoutExercise,
    to: Exercise,
    selfGuided: boolean
  ) => persistSwap({ mode, swapped, to, selfGuided, studentId });
  return { ...state, persist };
}

/** As alternativas do exercício aberto, recarregadas quando ele muda. */
function useAlternatives(current: Exercise | null, studentId: string): ExerciseSwapState {
  const [state, setState] = useState<ExerciseSwapState>(EMPTY);
  useEffect(() => {
    if (!current) return setState(EMPTY);
    let active = true;
    setState({ ...EMPTY, loading: true });
    loadAlternatives(current, studentId)
      .then((loaded) => active && setState({ ...loaded, loading: false, failed: false }))
      .catch(() => active && setState({ ...EMPTY, failed: true }));
    return () => {
      active = false;
    };
  }, [current, studentId]);
  return state;
}

interface SwapToPersist {
  mode: ExerciseSwapScope;
  swapped: WorkoutExercise;
  to: Exercise;
  selfGuided: boolean;
  studentId: string;
}

/** Grava o que a troca precisa gravar antes de valer. */
async function persistSwap({ mode, swapped, to, selfGuided, studentId }: SwapToPersist) {
  if (!selfGuided) return swapService.recordSwap(swapped.id, to.id, 'today');
  if (mode === 'today') return;
  await swapService.swapForever(swapped.id, to.id);
  if (mode === 'less') await swapService.avoid(studentId, swapped.exercise_id);
}

async function loadAlternatives(
  current: Exercise,
  studentId: string
): Promise<Pick<ExerciseSwapState, 'alternatives' | 'context'>> {
  const context = await swapService.contextOf(studentId);
  const alternatives = await swapService.alternativesTo(current, context);
  return { alternatives, context };
}
