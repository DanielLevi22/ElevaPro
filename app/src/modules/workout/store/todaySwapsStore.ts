import type { Exercise, WorkoutExercise } from '@elevapro/shared';
import { create } from 'zustand';
import { getLocalDateISOString } from '@/utils/dateUtils';

/** As trocas de um treino, válidas só no dia em que foram feitas. */
interface SwapsOfWorkout {
  day: string;
  byItem: Record<string, Exercise>;
}

interface TodaySwapsState {
  swaps: Record<string, SwapsOfWorkout>;
  swapToday: (workoutId: string, itemId: string, exercise: Exercise) => void;
}

/**
 * "Trocar só hoje" (#365, desenho 6d): a troca vale para o treino de hoje e
 * não toca o plano. Feita no detalhe, a sessão começa com ela; feita na sessão,
 * o detalhe mostra o que foi feito. No dia seguinte, o treino volta ao plano.
 *
 * Fica em memória: fechar o app desfaz a troca, e o plano continua o mesmo.
 */
export const useTodaySwapsStore = create<TodaySwapsState>((set) => ({
  swaps: {},
  swapToday: (workoutId, itemId, exercise) =>
    set((state) => {
      const today = getLocalDateISOString();
      const current = state.swaps[workoutId];
      const byItem = current?.day === today ? current.byItem : {};
      return {
        swaps: {
          ...state.swaps,
          [workoutId]: { day: today, byItem: { ...byItem, [itemId]: exercise } },
        },
      };
    }),
}));

/**
 * Os exercícios do treino com as trocas de hoje aplicadas. Troca de outro dia
 * não vale.
 *
 * @example const itens = withTodaySwaps(treino.exercises ?? [], swaps[treino.id], hoje);
 */
export function withTodaySwaps(
  items: readonly WorkoutExercise[],
  swaps: SwapsOfWorkout | undefined,
  today: string
): WorkoutExercise[] {
  if (!swaps || swaps.day !== today) return [...items];
  return items.map((item) => {
    const exercise = swaps.byItem[item.id];
    return exercise ? { ...item, exercise_id: exercise.id, exercise } : item;
  });
}

/** Os exercícios de hoje de um treino, já com as trocas. */
export function useTodayExercises(workoutId: string, items: readonly WorkoutExercise[]) {
  const swaps = useTodaySwapsStore((state) => state.swaps[workoutId]);
  return withTodaySwaps(items, swaps, getLocalDateISOString());
}
