import {
  type DailyIntake,
  dailyActivities,
  mealsOfDay,
  type NutritionSources,
  plannedMealsOn,
} from '@elevapro/shared';
// Direto do arquivo, e não do índice do módulo: o índice carrega as telas, e com
// elas os módulos nativos do relógio, só para somar calorias.
import { consumoDoDia, metaDoDia } from '@/modules/nutrition/services/consumoDoDia';

/**
 * A ponte entre a nutrição e a nutrição em números (tela 7 da #312): o que cada
 * dia rendeu e a meta diária do plano.
 *
 * Fica fora dos módulos porque quanto um prato rende é regra do módulo de nutrição
 * (`consumoDoDia`), e a conta do período mora no `shared`; o módulo de progresso
 * não importa o de nutrição.
 */

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Cada dia do intervalo com as refeições planejadas, as feitas e o que foi comido.
 *
 * @example summarizeNutrition(intakeByDay(sources, "2026-03-31", "2026-09-15"), today)
 */
export function intakeByDay(sources: NutritionSources, from: string, to: string): DailyIntake[] {
  const logsByDate = groupLogsByMeal(sources.logs);
  const activity = dailyActivities({
    from,
    to,
    sessions: [],
    ...sources,
    mealLogs: sources.logs,
  });
  return activity.map((day) => {
    const eaten = consumoDoDia(
      plannedMealsOn(sources.plan, sources.meals, day.date),
      logsByDate.get(day.date) ?? {},
      sources.items
    );
    return {
      date: day.date,
      plannedMeals: day.plannedMeals,
      doneMeals: day.doneMeals,
      calories: eaten.calorias,
      protein: eaten.proteina,
      carbs: eaten.carboidrato,
      fat: eaten.gordura,
    };
  });
}

/**
 * A meta diária de calorias: a digitada no plano, ou a média do prescrito nos dias
 * da semana que têm refeição. Média, e não o dia de hoje: num plano cíclico a linha
 * do gráfico mudaria conforme o dia em que a tela abre.
 *
 * @example dailyCalorieGoal(sources) // 2100
 */
export function dailyCalorieGoal(sources: NutritionSources): number | null {
  const { plan } = sources;
  if (!plan) return null;
  const goals = WEEKDAYS.map(
    (weekday) =>
      metaDoDia(plan, mealsOfDay(sources.meals, plan.plan_type, weekday), sources.items).calorias
  ).filter((goal) => goal > 0);
  if (goals.length === 0) return null;
  return Math.round(goals.reduce((sum, goal) => sum + goal, 0) / goals.length);
}

type LogsOfDay = Record<string, NutritionSources['logs'][number]>;

function groupLogsByMeal(logs: NutritionSources['logs']): Map<string, LogsOfDay> {
  const byDate = new Map<string, LogsOfDay>();
  for (const log of logs) {
    if (!log.diet_meal_id) continue;
    byDate.set(log.logged_date, { ...byDate.get(log.logged_date), [log.diet_meal_id]: log });
  }
  return byDate;
}
