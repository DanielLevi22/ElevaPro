import { dayNameOf, minutesOf, type NoticeState, weekdayOf } from '@elevapro/shared';

/** O que o widget de hoje mostra (#376, F7). Só nomes e horários do plano. */
export interface TodaySnapshot {
  date: string;
  /** Com "esconder detalhes", só a contagem: a tela inicial é vista por qualquer um. */
  hidden: boolean;
  pending: number;
  workout: { id: string; title: string; done: boolean } | null;
  nextMeal: { name: string; time: string } | null;
  waterMl: number;
}

/** A refeição que passou há menos que isto ainda é "a próxima": a pessoa pode estar comendo. */
const MEAL_GRACE_MINUTES = 60;

/**
 * O retrato do dia para o widget: o treino de hoje, a próxima refeição sem
 * marcar e a água. Sai do mesmo estado dos avisos, com as escolhas já
 * aplicadas.
 *
 * @example buildTodaySnapshot(estado, 1200, true).pending // 2
 */
export function buildTodaySnapshot(
  state: NoticeState,
  waterMl: number,
  hidden: boolean
): TodaySnapshot {
  const weekday = weekdayOf(state.today);
  const unlogged = state.meals
    .filter((meal) => meal.dayOfWeek === null || meal.dayOfWeek === weekday)
    .filter((meal) => !state.loggedMealIds.includes(meal.id))
    .sort((a, b) => a.time.localeCompare(b.time));
  const at = (time: string) => minutesOf(time) ?? 0;
  const next = unlogged.find((meal) => at(meal.time) >= state.nowMinutes - MEAL_GRACE_MINUTES);
  const plan = state.workouts.find((item) => item.day === dayNameOf(state.today));
  const workout = plan ? { id: plan.id, title: plan.title, done: state.trainedToday } : null;
  const overdueMeals = unlogged.filter((meal) => at(meal.time) <= state.nowMinutes).length;
  return {
    date: state.today,
    hidden,
    pending: overdueMeals + (workout && !workout.done ? 1 : 0),
    workout,
    nextMeal: next ? { name: next.name, time: next.time } : null,
    waterMl,
  };
}
