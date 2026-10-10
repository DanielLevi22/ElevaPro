/**
 * A conferência do plano que a IA devolveu, antes de mostrá-lo (ADR-0044).
 *
 * A IA monta o plano; o código confere que ele respeita o que a pessoa
 * escolheu e a meta que o código fixou. É o seam "plano gerado respeita as
 * escolhas" da #365: plano que não passa não chega à tela.
 */

import type { PractitionerPlanProposal } from "@elevapro/shared";

export type { PractitionerPlanProposal };

export interface CheckFood {
  name: string;
  serving_size: number;
  calories: number;
}

export interface PlanCheckContext {
  trainingDays: number;
  sessionMinutes: number;
  sports: readonly string[];
  mealsPerDay: number;
  /** A meta fixada pelo código; `null` quando não há dieta. */
  targetCalories: number | null;
  /** Só os alimentos já filtrados pelas exclusões: fora daqui é recusa. */
  allowedFoods: ReadonlyMap<string, CheckFood>;
  allowedExercises: ReadonlySet<string>;
}

/** Até onde as calorias do dia podem fugir da meta: o arredondamento das porções. */
const CALORIE_TOLERANCE = 0.1;

/**
 * Exercícios que cabem na sessão, por minutos. Provisório (CREF): nenhuma fonte
 * converte minutos em exercícios; a conta é séries × (execução + intervalo).
 */
const MAX_EXERCISES: Record<number, number> = { 30: 4, 45: 6, 60: 7, 90: 9 };

/**
 * Os motivos de recusa, cada um com o valor ofensor e o esperado. Vazio é
 * plano aceito.
 *
 * @example checkPlan(proposta, contexto) // ["2 treinos na semana; esperado 3, os dias escolhidos"]
 */
export function checkPlan(plan: PractitionerPlanProposal, ctx: PlanCheckContext): string[] {
  return [...checkWorkouts(plan, ctx), ...checkMeals(plan, ctx)];
}

function checkWorkouts(plan: PractitionerPlanProposal, ctx: PlanCheckContext): string[] {
  const errors: string[] = [];
  const regular = plan.workouts.filter((workout) => !workout.optional);
  const optional = plan.workouts.filter((workout) => workout.optional);

  if (regular.length !== ctx.trainingDays) {
    errors.push(
      `${regular.length} treinos na semana; esperado ${ctx.trainingDays}, os dias escolhidos`,
    );
  }
  // Exatamente uma por esporte: a mais é sessão inventada, a menos é o esporte
  // que a pessoa disse praticar sumindo do plano (#365).
  if (optional.length !== ctx.sports.length) {
    errors.push(
      `${optional.length} sessão(ões) opcional(is); esperado ${ctx.sports.length}, uma por esporte praticado`,
    );
  }

  const cap = MAX_EXERCISES[ctx.sessionMinutes] ?? MAX_EXERCISES[45];
  for (const workout of regular) {
    if (workout.exercises.length > cap) {
      errors.push(
        `"${workout.title}" tem ${workout.exercises.length} exercícios; cabem ${cap} em ${ctx.sessionMinutes} min`,
      );
    }
    for (const { exercise_name } of workout.exercises) {
      if (!ctx.allowedExercises.has(exercise_name)) {
        errors.push(`exercício "${exercise_name}" fora do catálogo do local escolhido`);
      }
    }
  }
  return errors;
}

function checkMeals(plan: PractitionerPlanProposal, ctx: PlanCheckContext): string[] {
  const meals = plan.meals ?? [];
  if (ctx.targetCalories === null) {
    return meals.length > 0 ? [`${meals.length} refeições num plano sem dieta pela triagem`] : [];
  }

  const errors: string[] = [];
  if (meals.length !== ctx.mealsPerDay) {
    errors.push(`${meals.length} refeições; esperado ${ctx.mealsPerDay}, as escolhidas`);
  }

  let calories = 0;
  for (const item of meals.flatMap((meal) => meal.items)) {
    const food = ctx.allowedFoods.get(item.food_name);
    if (!food) {
      errors.push(`alimento "${item.food_name}" fora da lista permitida pelas exclusões`);
      continue;
    }
    calories += (food.calories * item.quantity) / food.serving_size;
  }

  const total = Math.round(calories);
  if (Math.abs(total - ctx.targetCalories) > ctx.targetCalories * CALORIE_TOLERANCE) {
    errors.push(`${total} kcal no dia; esperado a meta de ${ctx.targetCalories} ± 10%`);
  }
  return errors;
}
