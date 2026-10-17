import { addDays, dayNameOf, minutesOf, type NoticeState, timeOf } from '@elevapro/shared';
import type { NoticeChoices } from './noticeChoicesStore';

/**
 * O estado do dia com as respostas da pessoa por cima: o que pulou hoje conta
 * como feito, a refeição sem aviso sai, a que pediu outro horário avisa mais
 * tarde e o treino movido vale amanhã.
 *
 * @example planNotices(applyNoticeChoices(estado, escolhas), preferencias);
 */
export function applyNoticeChoices(state: NoticeState, choices: NoticeChoices): NoticeState {
  const today = choices.day === state.today;
  const moved = choices.movedWorkout;
  const workout = state.workouts.find((item) => item.id === moved?.id);
  const movedDay =
    moved && workout && moved.date > state.today && moved.date < addDays(state.today, 7)
      ? [{ ...workout, day: dayNameOf(moved.date) }]
      : [];
  return {
    ...state,
    meals: state.meals
      .filter((meal) => !choices.mutedMeals.includes(meal.id))
      .map((meal) => ({ ...meal, time: later(meal.time, choices.mealDelays[meal.id] ?? 0) })),
    loggedMealIds: [...state.loggedMealIds, ...(today ? choices.skippedMeals : [])],
    trainedToday: state.trainedToday || (today && choices.skippedWorkout),
    workouts: [...movedDay, ...state.workouts],
  };
}

/** "12:00" mais 60 minutos é "13:00"; passar da meia-noite tira o aviso do dia. */
function later(time: string, minutes: number): string {
  const at = minutesOf(time);
  return minutes === 0 || at === null ? time : timeOf(at + minutes);
}
