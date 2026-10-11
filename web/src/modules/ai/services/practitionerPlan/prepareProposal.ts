import type { PractitionerPlanProposal } from "@elevapro/shared";
import type { CheckFood } from "./planCheck";
import { repairNames } from "./repairNames";
import { scaleToTarget } from "./scaleToTarget";

interface PrepareContext {
  allowedFoods: ReadonlyMap<string, CheckFood>;
  allowedExercises: ReadonlySet<string>;
  targetCalories: number | null;
}

export type Prepared = { proposal: PractitionerPlanProposal } | { problem: string };

/**
 * A resposta da IA pronta para a conferência: o treino mantido, quando O10 só
 * pediu refeições; os nomes reparados; o que está fora da lista retirado; e as
 * porções acertadas na meta pelo código.
 *
 * Tirar o alimento de fora, em vez de recusar o plano inteiro, é o que a IA
 * real pedia: ela insiste em iogurte para quem não come lactose. Ele sai, o
 * resto é reescalado, e o excluído continua sem jeito de aparecer.
 *
 * @example const pronto = prepareProposal(resposta, undefined, contexto);
 */
export function prepareProposal(
  answer: PractitionerPlanProposal | null,
  keepWorkouts: PractitionerPlanProposal["workouts"] | undefined,
  context: PrepareContext,
): Prepared {
  if (!answer) return { problem: "a resposta não era o JSON pedido" };
  const merged = keepWorkouts ? { ...answer, workouts: keepWorkouts } : answer;
  const repaired = repairNames(
    merged,
    [...context.allowedExercises],
    [...context.allowedFoods.keys()],
  );

  const meals = repaired.meals?.map((meal) => ({
    ...meal,
    items: meal.items.filter((item) => context.allowedFoods.has(item.food_name)),
  }));
  const empty = meals?.find((meal) => meal.items.length === 0);
  if (empty) return { problem: `a refeição "${empty.name}" só tinha alimentos fora da lista` };

  const filtered = { ...repaired, meals: meals ?? null };
  const proposal = scaleToTarget(filtered, context.allowedFoods, context.targetCalories);
  if (proposal) return { proposal };
  return {
    problem: `as porções somavam ${caloriesOf(filtered, context.allowedFoods)} kcal para uma meta de ${context.targetCalories}; longe demais para só ajustar a quantidade`,
  };
}

function caloriesOf(plan: PractitionerPlanProposal, foods: ReadonlyMap<string, CheckFood>): number {
  const items = (plan.meals ?? []).flatMap((meal) => meal.items);
  return Math.round(
    items.reduce((sum, item) => {
      const food = foods.get(item.food_name);
      return food ? sum + (food.calories * item.quantity) / food.serving_size : sum;
    }, 0),
  );
}
