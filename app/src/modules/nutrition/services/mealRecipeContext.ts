import { createHealthService, createNutritionService, mealsOfDay } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { type ItemDoPrato, itensDaRefeicao } from './consumoDoDia';

export interface MealRecipeRequest {
  studentId: string;
  mealId: string;
  date: string;
  canReadDiet: boolean;
}

export type MealRecipeContext =
  | { status: 'ready'; mealName: string; items: ItemDoPrato[] }
  | { status: 'forbidden' | 'consent_required' | 'not_found' };

/** Lê só a refeição autorizada, sem gravar escolhas. @example await loadMealRecipeContext(request) */
export async function loadMealRecipeContext(
  request: MealRecipeRequest
): Promise<MealRecipeContext> {
  if (!request.canReadDiet || !request.studentId) return { status: 'forbidden' };
  if (!validDate(request.date)) return { status: 'not_found' };
  const health = createHealthService(supabase);
  if (!(await health.hasCollectionConsent(request.studentId)))
    return { status: 'consent_required' };
  return readMeal(request);
}

async function readMeal(request: MealRecipeRequest): Promise<MealRecipeContext> {
  const nutrition = createNutritionService(supabase);
  const plan = await nutrition.fetchActiveDietPlan(request.studentId);
  if (!plan || plan.student_id !== request.studentId || plan.status !== 'active')
    return { status: 'not_found' };
  const [meals, logs] = await Promise.all([
    nutrition.fetchDietMeals(plan.id),
    nutrition.fetchMealLogs(request.studentId, request.date),
  ]);
  const weekDay = new Date(`${request.date}T12:00:00`).getDay();
  const meal = mealsOfDay(meals, plan.plan_type, weekDay).find(
    (entry) => entry.id === request.mealId && entry.diet_plan_id === plan.id
  );
  if (!meal) return { status: 'not_found' };
  const log = logs.find(
    (entry) =>
      entry.diet_meal_id === meal.id &&
      entry.student_id === request.studentId &&
      entry.logged_date === request.date
  );
  return {
    status: 'ready',
    mealName: meal.name,
    items: itensDaRefeicao(log, meal.diet_meal_items),
  };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
