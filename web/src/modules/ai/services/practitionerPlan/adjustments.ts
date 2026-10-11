import type { OnboardingPlanPending, OnboardingPlanTarget } from "@elevapro/shared";

/** Um alimento do banco com o que a troca precisa saber. */
export interface CatalogFood {
  name: string;
  category: string | null;
  serving_size: number;
  calories: number;
}

export interface FoodSwap {
  mealIndex: number;
  itemIndex: number;
  from: string;
  to: string;
}

const PROTEIN_STEP = 20;
const GRAM_STEP = 5;

/**
 * A troca que O10 oferece: a proteína da maior refeição pela mais parecida em
 * densidade calórica, da mesma categoria. Em código, sem IA: trocar alimento é
 * consulta ao banco, e não opinião.
 *
 * @example suggestSwap(pendente, alimentos) // { from: "Frango…", to: "Tilápia…" }
 */
export function suggestSwap(
  pending: OnboardingPlanPending,
  foods: readonly CatalogFood[],
): FoodSwap | null {
  const meals = pending.proposal.meals;
  if (!meals?.length) return null;
  const byName = new Map(foods.map((food) => [food.name, food]));
  const mealIndex = pending.mealCalories.indexOf(Math.max(...pending.mealCalories));

  const items = meals[mealIndex]?.items ?? [];
  const itemIndex = items.findIndex((item) => byName.get(item.food_name)?.category === "proteina");
  const current = byName.get(items[itemIndex]?.food_name ?? "");
  if (!current) return null;

  const density = (food: CatalogFood) => food.calories / food.serving_size;
  const inUse = new Set(meals.flatMap((meal) => meal.items.map((item) => item.food_name)));
  const candidates = foods
    .filter((food) => food.category === current.category && !inUse.has(food.name))
    .sort(
      (a, b) => Math.abs(density(a) - density(current)) - Math.abs(density(b) - density(current)),
    );
  return candidates[0]
    ? { mealIndex, itemIndex, from: current.name, to: candidates[0].name }
    : null;
}

/**
 * Aplica a troca na quantidade que dá as mesmas calorias.
 *
 * @example const ajustado = swapFood(pendente, troca, alimentos);
 */
export function swapFood(
  pending: OnboardingPlanPending,
  swap: FoodSwap,
  foods: readonly CatalogFood[],
): OnboardingPlanPending {
  const byName = new Map(foods.map((food) => [food.name, food]));
  const from = byName.get(swap.from) as CatalogFood;
  const to = byName.get(swap.to) as CatalogFood;
  const meals = pending.proposal.meals ?? [];
  const oldItem = meals[swap.mealIndex].items[swap.itemIndex];
  const kcal = (from.calories * oldItem.quantity) / from.serving_size;
  const quantity = Math.max(
    GRAM_STEP,
    Math.round(((kcal / to.calories) * to.serving_size) / GRAM_STEP) * GRAM_STEP,
  );

  const newMeals = meals.map((meal, m) =>
    m !== swap.mealIndex
      ? meal
      : {
          ...meal,
          items: meal.items.map((item, i) =>
            i === swap.itemIndex ? { food_name: to.name, quantity } : item,
          ),
        },
  );
  return {
    ...pending,
    proposal: { ...pending.proposal, meals: newMeals },
    mealCalories: newMeals.map((meal) =>
      Math.round(
        meal.items.reduce((sum, item) => {
          const food = byName.get(item.food_name);
          return food ? sum + (food.calories * item.quantity) / food.serving_size : sum;
        }, 0),
      ),
    ),
  };
}

/**
 * +20 g de proteína no lugar de 20 g de carboidrato: as calorias não mudam, e
 * por isso as travas da meta (piso na TMB, ritmo) continuam valendo.
 *
 * @example moreProtein({ calories: 2000, protein: 150, carbs: 220, fat: 60, guards: [] }).protein // 170
 */
export function moreProtein(target: OnboardingPlanTarget | null): OnboardingPlanTarget | null {
  if (!target) return null;
  const step = Math.min(PROTEIN_STEP, target.carbs);
  return { ...target, protein: target.protein + step, carbs: target.carbs - step };
}
