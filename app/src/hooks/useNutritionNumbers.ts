import {
  addDays,
  createNutritionService,
  type DailyIntake,
  type DietMeal,
  type DietMealItem,
  type DietPlan,
  type MealLog,
  type NutritionPeriod,
  plannedMealsOn,
  summarizeNutrition,
} from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { avisandoSeFalhar } from '@/lib/registro';
import { consumoDoDia, metaDoDia } from '@/modules/nutrition/routes/index';
import { localDateKey } from '@/services/healthSync';

const nutrition = createNutritionService(supabase);

/** As 12 semanas da tela e as 12 anteriores, para a variação. */
const DAYS = 24 * 7;

export interface NutritionNumbers {
  period: NutritionPeriod;
  /** A meta de calorias de hoje, do plano; `null` sem plano. */
  dailyGoal: number | null;
  loading: boolean;
}

interface NutritionSources {
  plan: DietPlan | null;
  meals: DietMeal[];
  items: Record<string, DietMealItem[]>;
  logs: MealLog[];
}

/**
 * A nutrição em números do Student (tela 7 da #312).
 *
 * Mora fora dos módulos porque junta o que a nutrição sabe (quanto cada refeição
 * rende) com a conta do período, e o módulo de progresso não importa o de nutrição.
 * O log de falha vai sem o erro: o registro de refeição é dado de saúde (Art. 6°, VII).
 *
 * @example const { period, dailyGoal } = useNutritionNumbers(user.id);
 */
export function useNutritionNumbers(studentId: string): NutritionNumbers {
  const today = localDateKey();
  const { data, isLoading } = useQuery({
    queryKey: ['nutritionNumbers', studentId, today],
    queryFn: () => avisandoSeFalhar('progress.read_nutrition', () => loadSources(studentId, today)),
  });

  return useMemo(() => {
    const days = data ? intakeByDay(data, today) : [];
    return {
      period: summarizeNutrition(days, today),
      dailyGoal: data?.plan ? goalOf(data, today) : null,
      loading: isLoading,
    };
  }, [data, today, isLoading]);
}

/** O plano vem antes porque as refeições são dele; os registros não dependem dele. */
async function loadSources(studentId: string, today: string): Promise<NutritionSources> {
  const [plan, logs] = await Promise.all([
    nutrition.fetchActiveDietPlan(studentId),
    nutrition.fetchMealLogsByRange(studentId, addDays(today, -(DAYS - 1)), today),
  ]);
  const meals = plan ? await nutrition.fetchDietMeals(plan.id) : [];
  const items = Object.fromEntries(meals.map((meal) => [meal.id, meal.diet_meal_items]));
  return { plan, meals, items, logs };
}

function intakeByDay(sources: NutritionSources, today: string): DailyIntake[] {
  const logsByDate = new Map<string, Record<string, MealLog>>();
  for (const log of sources.logs) {
    if (!log.diet_meal_id) continue;
    logsByDate.set(log.logged_date, {
      ...logsByDate.get(log.logged_date),
      [log.diet_meal_id]: log,
    });
  }
  return Array.from({ length: DAYS }, (_, index) => {
    const date = addDays(today, -(DAYS - 1 - index));
    const planned = plannedMealsOn(sources.plan, sources.meals, date);
    const logs = logsByDate.get(date) ?? {};
    const eaten = consumoDoDia(planned, logs, sources.items);
    return {
      date,
      plannedMeals: planned.length,
      doneMeals: planned.filter((meal) => logs[meal.id]?.completed).length,
      calories: eaten.calorias,
      protein: eaten.proteina,
      carbs: eaten.carboidrato,
      fat: eaten.gordura,
    };
  });
}

function goalOf(sources: NutritionSources, today: string): number | null {
  if (!sources.plan) return null;
  const goal = metaDoDia(
    sources.plan,
    plannedMealsOn(sources.plan, sources.meals, today),
    sources.items
  ).calorias;
  return goal > 0 ? Math.round(goal) : null;
}
