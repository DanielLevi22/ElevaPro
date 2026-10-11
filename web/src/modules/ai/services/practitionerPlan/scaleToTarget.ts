import type { PractitionerPlanProposal } from "@elevapro/shared";
import type { CheckFood } from "./planCheck";

/** Fora disto o plano estava longe demais da meta: escalar mudaria a comida, não a porção. */
const MIN_FACTOR = 0.5;
const MAX_FACTOR = 2;
const GRAM_STEP = 5;

/**
 * Acerta as porções na meta do código: a IA escolhe os alimentos e a proporção
 * entre eles, e o código ajusta as quantidades para o dia bater as calorias
 * (ADR-0044). Somar calorias é conta; o modelo errava a unidade da quantidade e
 * entregava 136 kcal para uma meta de 1.989.
 *
 * Devolve `null` quando o fator sai de 0,5–2: aí o plano veio errado, e a
 * conferência pede outro.
 *
 * @example const ajustado = scaleToTarget(proposta, alimentos, 1989);
 */
export function scaleToTarget(
  plan: PractitionerPlanProposal,
  foods: ReadonlyMap<string, CheckFood>,
  targetCalories: number | null,
): PractitionerPlanProposal | null {
  if (!plan.meals || targetCalories === null) return plan;

  const total = plan.meals
    .flatMap((meal) => meal.items)
    .reduce((sum, item) => sum + kcalOf(item, foods), 0);
  const factor = total > 0 ? targetCalories / total : 0;
  if (factor < MIN_FACTOR || factor > MAX_FACTOR) return null;

  const meals = plan.meals.map((meal) => ({
    ...meal,
    items: meal.items.map((item) => ({ ...item, quantity: rounded(item.quantity * factor) })),
  }));
  return { ...plan, meals: absorbRounding(meals, foods, targetCalories) };
}

type Meals = NonNullable<PractitionerPlanProposal["meals"]>;

/**
 * Arredondar cada item para 5 g erra pouco por item e muito no dia: muitos itens
 * pequenos e calóricos (azeite, castanha) somaram 2.447 kcal para 1.989 na IA
 * real. A diferença vai para o alimento que mais pesa no dia, onde 5 g contam
 * menos, e o mínimo de 5 g continua valendo.
 */
function absorbRounding(
  meals: Meals,
  foods: ReadonlyMap<string, CheckFood>,
  target: number,
): Meals {
  const items = meals.flatMap((meal, m) => meal.items.map((item, i) => ({ item, m, i })));
  const total = items.reduce((sum, { item }) => sum + kcalOf(item, foods), 0);
  const heaviest = items.reduce((best, entry) =>
    kcalOf(entry.item, foods) > kcalOf(best.item, foods) ? entry : best,
  );
  const food = foods.get(heaviest.item.food_name);
  if (!food) return meals;

  const gramsToFix = ((target - total) * food.serving_size) / food.calories;
  const quantity = rounded(heaviest.item.quantity + gramsToFix);
  return meals.map((meal, m) =>
    m !== heaviest.m
      ? meal
      : {
          ...meal,
          items: meal.items.map((item, i) => (i === heaviest.i ? { ...item, quantity } : item)),
        },
  );
}

function kcalOf(
  item: { food_name: string; quantity: number },
  foods: ReadonlyMap<string, CheckFood>,
) {
  const food = foods.get(item.food_name);
  return food ? (food.calories * item.quantity) / food.serving_size : 0;
}

/** O banco mede todo alimento em grama: a porção servida anda de 5 em 5. */
function rounded(quantity: number): number {
  return Math.max(GRAM_STEP, Math.round(quantity / GRAM_STEP) * GRAM_STEP);
}
