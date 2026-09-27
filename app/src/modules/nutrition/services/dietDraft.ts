import type { CreateDietPlanInput, DietPlanPreferences } from '@elevapro/shared';

export interface DraftSource {
  studentId: string;
  ownPlan: boolean;
  planName: string;
  targetCalories: number;
  macroGrams: { protein: number; carbs: number; fat: number };
  durationWeeks: number;
  preferences: DietPlanPreferences;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addWeeks(isoDate: string, weeks: number): string {
  const start = new Date(`${isoDate}T00:00:00Z`).getTime();
  return new Date(start + weeks * 7 * DAY_MS).toISOString().slice(0, 10);
}

/**
 * O rascunho que o passo 2 grava. O plano do Praticante vai sem especialista:
 * é o único formato que a RLS deixa ele criar (0073).
 *
 * @example
 * await nutrition.createDietPlanFromStrategy(draftInput(estado, user.id, hoje), estado.strategy);
 */
export function draftInput(
  source: DraftSource,
  userId: string,
  today: string
): Omit<CreateDietPlanInput, 'plan_type'> {
  return {
    student_id: source.studentId,
    specialist_id: source.ownPlan ? null : userId,
    name: source.planName.trim(),
    start_date: today,
    end_date: addWeeks(today, source.durationWeeks),
    target_calories: source.targetCalories,
    target_protein: source.macroGrams.protein,
    target_carbs: source.macroGrams.carbs,
    target_fat: source.macroGrams.fat,
    ...source.preferences,
  };
}
