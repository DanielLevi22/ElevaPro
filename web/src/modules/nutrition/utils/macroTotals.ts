import type { Food } from "@elevapro/shared";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type MacroFood = Pick<Food, "serving_size" | "calories" | "protein" | "carbs" | "fat">;

interface MacroItem {
  quantity: number;
  food?: MacroFood | null;
}

interface MacroMeal {
  meal_foods?: MacroItem[] | null;
}

export type RemainingTone = "below" | "met" | "over" | "none";

const EMPTY_TOTALS: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/**
 * Soma os macros dos itens de uma refeição, escalando pela porção do alimento.
 *
 * @example sumItemMacros(meal.meal_foods).protein // 36
 */
export function sumItemMacros(items: MacroItem[] | null | undefined): MacroTotals {
  return (items ?? []).reduce<MacroTotals>((acc, { quantity, food }) => {
    // Item sem alimento carregado (ou porção zerada) não pode virar NaN e contaminar o dia.
    if (!food?.serving_size) return acc;
    const ratio = quantity / food.serving_size;
    return {
      calories: acc.calories + (food.calories ?? 0) * ratio,
      protein: acc.protein + (food.protein ?? 0) * ratio,
      carbs: acc.carbs + (food.carbs ?? 0) * ratio,
      fat: acc.fat + (food.fat ?? 0) * ratio,
    };
  }, EMPTY_TOTALS);
}

/**
 * Soma os macros de várias refeições — o total já montado de um dia.
 *
 * @example sumMealsMacros(dayMeals).calories // 2140
 */
export function sumMealsMacros(meals: MacroMeal[]): MacroTotals {
  return meals.reduce<MacroTotals>((acc, meal) => {
    const mealTotals = sumItemMacros(meal.meal_foods);
    return {
      calories: acc.calories + mealTotals.calories,
      protein: acc.protein + mealTotals.protein,
      carbs: acc.carbs + mealTotals.carbs,
      fat: acc.fat + mealTotals.fat,
    };
  }, EMPTY_TOTALS);
}

// Folga de 5%: montar dieta com alimento real não fecha no grama, e 185g de 180g
// pintado de alerta empurrava o especialista a ajustar o que já estava bom.
const TARGET_TOLERANCE = 0.05;

/**
 * Traduz adicionado × meta no que o especialista precisa ler: quanto falta, se está
 * dentro da folga ou quanto passou.
 *
 * @example describeRemaining(36, 187, "g") // { text: "faltam 151g", tone: "below" }
 */
export function describeRemaining(
  consumed: number,
  target: number,
  unit: string,
): { text: string; tone: RemainingTone } {
  if (target <= 0) return { text: "sem meta", tone: "none" };
  // Compara já arredondado: o especialista lê inteiros, e 186,6 de 187 aparece como "187".
  const diff = Math.round(consumed) - Math.round(target);
  if (diff === 0) return { text: "na meta", tone: "met" };
  // "faltam" e "passou" com a mesma forma: o especialista lê o sentido pela palavra, não pelo sinal.
  const gap = diff < 0 ? `faltam ${-diff}${unit}` : `passou ${diff}${unit}`;
  if (Math.abs(diff) <= target * TARGET_TOLERANCE) return { text: `na meta, ${gap}`, tone: "met" };
  return { text: gap, tone: diff < 0 ? "below" : "over" };
}

export type MacroKey = keyof MacroTotals;

interface PlanTargets {
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
}

/**
 * Lê a meta diária do plano no mesmo formato da soma, com zero onde não há meta.
 *
 * @example dailyTargets(dietPlan).protein // 180
 */
export function dailyTargets(plan: PlanTargets): MacroTotals {
  return {
    calories: plan.target_calories ?? 0,
    protein: plan.target_protein ?? 0,
    carbs: plan.target_carbs ?? 0,
    fat: plan.target_fat ?? 0,
  };
}

/**
 * Macros que uma quantidade de um alimento soma ao dia.
 *
 * @example macrosForQuantity(frango, 150).protein // 45
 */
export function macrosForQuantity(food: MacroFood, quantity: number): MacroTotals {
  return sumItemMacros([{ quantity, food }]);
}

/**
 * Quantidade do alimento que fecha o que falta de um macro, ou `null` quando não há o
 * que fechar ou o alimento não tem aquele macro.
 *
 * @example quantityToClose(frango, "protein", 45) // 150
 */
export function quantityToClose(
  food: MacroFood,
  macro: MacroKey,
  remaining: number,
): number | null {
  const perServing = food[macro] ?? 0;
  if (remaining <= 0 || perServing <= 0 || !food.serving_size) return null;
  return Math.round((remaining / perServing) * food.serving_size);
}
