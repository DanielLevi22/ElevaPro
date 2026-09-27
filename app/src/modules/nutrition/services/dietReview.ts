import { DIAS_DA_SEMANA, type DietaryRestriction, type DietPlanType } from '@elevapro/shared';
import { type ItemDoPrato, MACROS_ZERADOS, type Macros, macrosDosItens } from './consumoDoDia';
import { restrictionNotes } from './dietRestrictionReview';

interface MealWithItems {
  day_of_week: number | null;
  diet_meal_items?: readonly unknown[] | null;
}

export interface DayTotal {
  /** `null` na dieta única, que vale para a semana inteira. */
  dayOfWeek: number | null;
  macros: Macros;
}

// Dentro de 10% da meta é "na meta": a balança de cozinha erra mais que isso.
const TOLERANCE = 0.1;
// A proteína é meta mínima, com 5% de folga para o arredondamento da porção.
const PROTEIN_FLOOR = 0.95;

function itemsOf(meal: MealWithItems): ItemDoPrato[] {
  return (meal.diet_meal_items ?? []) as ItemDoPrato[];
}

/**
 * O total montado de cada dia do plano, na ordem da semana. Dieta única é um
 * dia só, sem dia da semana.
 *
 * @example
 * const totals = dayTotals(meals, plan.plan_type);
 */
export function dayTotals(meals: readonly MealWithItems[], planType: DietPlanType): DayTotal[] {
  const byDay = new Map<number | null, ItemDoPrato[]>();
  const days = planType === 'unique' ? [null] : [0, 1, 2, 3, 4, 5, 6];
  for (const day of days) byDay.set(day, []);
  for (const meal of meals) {
    const day = planType === 'unique' ? null : meal.day_of_week;
    byDay.set(day, [...(byDay.get(day) ?? []), ...itemsOf(meal)]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a ?? -1) - (b ?? -1))
    .map(([dayOfWeek, items]) => ({ dayOfWeek, macros: macrosDosItens(items) }));
}

function dayName(dayOfWeek: number | null): string {
  return dayOfWeek === null ? 'O dia' : DIAS_DA_SEMANA[dayOfWeek];
}

function calorieNote(totals: DayTotal[], target: number): string {
  const off = totals.find((t) => Math.abs(t.macros.calorias - target) > target * TOLERANCE);
  if (!off) return 'Calorias dentro da meta.';
  const delta = Math.round(off.macros.calorias - target);
  const direction = delta > 0 ? 'acima' : 'abaixo';
  return `${dayName(off.dayOfWeek)} ficou ${Math.abs(delta)} kcal ${direction} da meta.`;
}

function proteinNote(totals: DayTotal[], target: number): string {
  const short = totals.filter((t) => t.macros.proteina < target * PROTEIN_FLOOR).length;
  if (short === 0) return 'Proteína bate a meta.';
  return `Proteína abaixo da meta em ${short} ${short === 1 ? 'dia' : 'dias'}.`;
}

/**
 * O aviso da revisão: onde o plano montado se afasta da meta. Conta local
 * sobre o plano, sem chamada de IA.
 *
 * @example
 * reviewNotes(dayTotals(meals, 'cyclic'), { calorias: 2240, proteina: 168 });
 */
export function reviewNotes(
  totals: readonly DayTotal[],
  target: Pick<Macros, 'calorias' | 'proteina'>,
  foodReview?: { meals: readonly MealWithItems[]; restrictions: readonly DietaryRestriction[] }
): string[] {
  const withFood = totals.filter((t) => t.macros.calorias > MACROS_ZERADOS.calorias);
  if (withFood.length === 0) return ['Nenhum alimento montado ainda.'];
  const emptyDays = totals.length - withFood.length;
  const missing = emptyDays
    ? [`${emptyDays} ${emptyDays === 1 ? 'dia sem alimentos.' : 'dias sem alimentos.'}`]
    : [];
  return [
    ...missing,
    calorieNote([...totals], target.calorias),
    proteinNote([...totals], target.proteina),
    ...restrictionNotes(foodReview?.meals ?? [], foodReview?.restrictions ?? []),
  ];
}
