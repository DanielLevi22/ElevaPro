import { DIETARY_RESTRICTION_LABELS, type DietaryRestriction } from '@elevapro/shared';
import { type ItemDoPrato, macrosDosItens } from './consumoDoDia';

interface MealWithItems {
  diet_meal_items?: readonly unknown[] | null;
}

/**
 * Kcal de uma refeição do plano, pela porção de referência de cada alimento.
 *
 * @example mealCalories(refeicao) // 420
 */
export function mealCalories(meal: MealWithItems): number {
  return macrosDosItens((meal.diet_meal_items ?? []) as ItemDoPrato[]).calorias;
}

/** Kcal das refeições de um dia. @example dayCalories(refeicoesDoDia) */
export function dayCalories(meals: readonly MealWithItems[]): number {
  return meals.reduce((total, meal) => total + mealCalories(meal), 0);
}

const KCAL_FORMAT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Kcal inteira, com o ponto de milhar: "2.240". @example formatKcal(2240) */
export function formatKcal(kcal: number): string {
  return KCAL_FORMAT.format(Math.round(kcal));
}

/**
 * A linha de resumo do plano no kit: "5 refeições · 2.238 kcal · sem lactose".
 *
 * @example planSummaryLine(5, 2238, ['lactose_free'])
 */
export function planSummaryLine(
  mealCount: number,
  kcal: number,
  restrictions: readonly DietaryRestriction[]
): string {
  const meals = `${mealCount} ${mealCount === 1 ? 'refeição' : 'refeições'}`;
  const tags = restrictions.map((tag) => DIETARY_RESTRICTION_LABELS[tag].toLowerCase());
  return [meals, `${formatKcal(kcal)} kcal`, ...tags].join(' · ');
}
