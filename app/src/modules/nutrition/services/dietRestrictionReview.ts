import { DIETARY_RESTRICTION_LABELS, type DietaryRestriction } from '@elevapro/shared';

interface ReviewMeal {
  diet_meal_items?: readonly unknown[] | null;
}

const ANIMAL_FLESH =
  /\b(frango|carne|bovina|bovino|suina|suino|porco|peixe|atum|salmao|sardinha|camarao|presunto|bacon|aves)\b/;
const DAIRY = /\b(leite|queijo|iogurte|manteiga|requeijao|laticinio|laticinios|whey)\b/;
const GLUTEN_SOURCE = /\b(trigo|centeio|cevada|malte|pao|macarrao)\b/;
const OTHER_ANIMAL = /\b(ovo|ovos|mel|gelatina)\b/;
const PLANT_MILK = /\bleite (de|do) (coco|soja|aveia|amendoas|arroz|castanha)\b/;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function possibleConflict(
  name: string,
  category: string,
  restriction: DietaryRestriction
): boolean {
  const label = normalize(name);
  const description = `${label} ${normalize(category)}`;
  if (restriction === 'gluten_free') {
    return !/\b(sem|zero) gluten\b/.test(label) && GLUTEN_SOURCE.test(description);
  }
  const dairy = !PLANT_MILK.test(label) && DAIRY.test(description);
  if (restriction === 'lactose_free') {
    return !/\b(sem|zero) lactose\b/.test(label) && !/\bvegan[oa]\b/.test(label) && dairy;
  }
  if (/\bvegan[oa]\b/.test(label)) return false;
  const meat = !/\bvegetarian[oa]\b/.test(label) && ANIMAL_FLESH.test(description);
  return restriction === 'vegetarian' ? meat : meat || dairy || OTHER_ANIMAL.test(description);
}

/** Avisos locais conservadores; nome/categoria não certificam ingredientes ou ausência de alergênicos.
 * @example restrictionNotes(meals, ['vegetarian']);
 */
export function restrictionNotes(
  meals: readonly ReviewMeal[],
  restrictions: readonly DietaryRestriction[]
): string[] {
  if (!restrictions.length) return [];
  const warnings = new Set<string>();
  for (const item of meals.flatMap((meal) => meal.diet_meal_items ?? [])) {
    if (!item || typeof item !== 'object' || !('food' in item)) continue;
    const food = item.food as { name?: string; category?: string | null } | null;
    if (typeof food?.name !== 'string') continue;
    for (const restriction of restrictions) {
      if (possibleConflict(food.name, food.category ?? '', restriction)) {
        warnings.add(
          `Possível conflito: ${food.name} · ${DIETARY_RESTRICTION_LABELS[restriction]}. Confira a composição.`
        );
      }
    }
  }
  return [
    ...warnings,
    'Conferência parcial por nome e categoria: revise ingredientes e rótulos para as restrições do plano.',
  ];
}
