import type { DietMeal, DietPlan, MealLog } from "../types/nutrition.types";
import { addDays, daysBetween, weekdayOf } from "./dateOnly";
import { mealsOfDay } from "./mealsOfDay";

/**
 * O que aconteceu em cada dia, a partir das fontes de verdade (issue #312).
 *
 * Existe porque `daily_goals` não serve: grava o feito e nunca a meta, e já
 * divergiu das sessões e dos registros de refeição. Hub, relatório e nutrição
 * em números contam em cima desta lista, e não de uma tabela de resumo.
 */

export interface DailyActivity {
  date: string;
  /** WorkoutSessions concluídas no dia, de qualquer tipo — cardio incluído. */
  workouts: number;
  /** Das concluídas, as de cardio. O relatório mostra as duas lado a lado. */
  cardioSessions: number;
  /** Refeições do plano para o dia; zero sem plano ou antes do início dele. */
  plannedMeals: number;
  /** Das planejadas, as registradas como feitas. */
  doneMeals: number;
  /** Toda refeição registrada como feita, no plano atual ou não. */
  loggedMeals: number;
}

export interface DailyActivityInput {
  from: string;
  to: string;
  /** Cada sessão concluída, com o dia local e se foi cardio. */
  sessions: readonly { date: string; cardio: boolean }[];
  plan: Pick<DietPlan, "plan_type" | "start_date"> | null;
  meals: readonly Pick<DietMeal, "id" | "day_of_week">[];
  mealLogs: readonly Pick<MealLog, "logged_date" | "diet_meal_id" | "completed">[];
}

/**
 * Um registro por dia do intervalo, com o que aconteceu nele: é a base das contas
 * de sequência, aderência e consistência.
 *
 * @example
 * dailyActivities({ from: "2026-06-15", to: "2026-09-15", sessions, plan, meals, mealLogs })
 */
export function dailyActivities(input: DailyActivityInput): DailyActivity[] {
  const workoutsByDate = countBy(input.sessions.map((session) => session.date));
  const cardioByDate = countBy(
    input.sessions.filter((session) => session.cardio).map((session) => session.date),
  );
  const doneLogs = input.mealLogs.filter((log) => log.completed);
  const logsByDate = groupBy(doneLogs, (log) => log.logged_date);
  const length = daysBetween(input.from, input.to) + 1;

  return Array.from({ length }, (_, index) => {
    const date = addDays(input.from, index);
    const logs = logsByDate.get(date) ?? [];
    const planned = plannedMealsOn(input.plan, input.meals, date);
    const loggedIds = new Set(logs.map((log) => log.diet_meal_id));
    return {
      date,
      workouts: workoutsByDate.get(date) ?? 0,
      cardioSessions: cardioByDate.get(date) ?? 0,
      plannedMeals: planned.length,
      doneMeals: planned.filter((meal) => loggedIds.has(meal.id)).length,
      loggedMeals: logs.length,
    };
  });
}

/**
 * As refeições do plano que valem no dia; nenhuma sem plano ou antes do início dele.
 *
 * @example plannedMealsOn(plan, meals, "2026-09-15").length // 4
 */
export function plannedMealsOn<Meal extends Pick<DietMeal, "day_of_week">>(
  plan: DailyActivityInput["plan"],
  meals: readonly Meal[],
  date: string,
): Meal[] {
  if (!plan) return [];
  if (plan.start_date && date < plan.start_date) return [];
  return mealsOfDay(meals, plan.plan_type, weekdayOf(date));
}

function countBy(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}
