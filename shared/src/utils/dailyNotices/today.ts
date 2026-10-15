import type { DayOfWeek } from "../../types/workouts.types";
import { weekdayOf } from "../dateOnly";
import type { RestPeriod } from "../restMode";
import type { NoticeMeal, NoticeWorkout } from "./types";

/*
 * O que vale num dia: as refeições, o treino e a pausa. O agendador, o widget e
 * o "Falta hoje" leem pelo mesmo caminho.
 */

const DAY_NAMES: readonly DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * O dia da semana da data como os treinos gravam.
 *
 * @example dayNameOf("2026-10-14") // "wednesday"
 */
export function dayNameOf(date: string): DayOfWeek {
  return DAY_NAMES[weekdayOf(date)];
}

/**
 * As refeições do dia; a sem dia (plano único) vale todo dia.
 *
 * @example mealsOn(estado.meals, "2026-10-14").map((meal) => meal.name) // ["Café", "Almoço"]
 */
export function mealsOn(meals: readonly NoticeMeal[], day: string): NoticeMeal[] {
  const weekday = weekdayOf(day);
  return meals.filter((meal) => meal.dayOfWeek === null || meal.dayOfWeek === weekday);
}

/**
 * O treino do dia, ou nulo em dia sem treino.
 *
 * @example workoutOn(estado.workouts, "2026-10-14")?.title // "Treino B"
 */
export function workoutOn(workouts: readonly NoticeWorkout[], day: string): NoticeWorkout | null {
  return workouts.find((item) => item.day === dayNameOf(day)) ?? null;
}

/**
 * A pausa vale do início até a volta, ou até o fim previsto; sem os dois, sem fim.
 *
 * @example restingOn(pausas, "2026-10-14") // true
 */
export function restingOn(rests: readonly RestPeriod[], day: string): boolean {
  return rests.some(
    (rest) =>
      rest.starts_on <= day &&
      (rest.ended_on === null || day < rest.ended_on) &&
      (rest.planned_until === null || day <= rest.planned_until),
  );
}
