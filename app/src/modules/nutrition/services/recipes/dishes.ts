import type { CatalogDish } from '@elevapro/shared';
import type { ItemDoPrato } from '../consumoDoDia';
import { recipeIngredient } from './ingredients';
import { currentMealSteps } from './preparation';
import type {
  DishOption,
  ListedIngredient,
  MealCookingStep,
  MealPreparation,
  RecipeIngredient,
} from './types';

// Cada foto pesa ~180 KB: a lista mostra as melhores opções, não o catálogo.
const MAX_DISH_OPTIONS = 12;

/**
 * Pratos do catálogo cujos alimentos estão todos na refeição. O casamento é no
 * aparelho: o servidor nunca recebe o que o aluno come (ADR-0049).
 *
 * @example matchCatalogDishes(items, catalog.dishes)[0]?.exact
 */
export function matchCatalogDishes(
  items: readonly ItemDoPrato[],
  dishes: readonly CatalogDish[]
): DishOption[] {
  const listed = listedIngredients(items);
  const byFood = new Map(listed.map((ingredient) => [ingredient.foodId, ingredient]));
  return dishes
    .filter((dish) => dish.foodIds.every((foodId) => byFood.has(foodId)))
    .map((dish) => toOption(dish, listed, listed.length === items.length))
    .sort(
      (a, b) =>
        Number(b.exact) - Number(a.exact) ||
        a.sides.length - b.sides.length ||
        a.title.localeCompare(b.title)
    )
    .slice(0, MAX_DISH_OPTIONS);
}

/**
 * Preparo de um prato importado: o guia específico quando todos os alimentos
 * são reconhecidos, e o genérico quando não — sem inventar passo culinário.
 *
 * @example dishPreparation(items, option).steps.length
 */
export function dishPreparation(items: readonly ItemDoPrato[], dish: DishOption): MealPreparation {
  const recognized = items.map(recipeIngredient);
  const known = recognized.every((item): item is RecipeIngredient => item !== null)
    ? currentMealSteps(recognized as RecipeIngredient[])
    : null;
  return {
    title: dish.title,
    image: { url: dish.imageUrl },
    ingredients: dish.ingredients,
    steps: known ?? genericSteps(dish),
  };
}

function genericSteps(dish: DishOption): MealCookingStep[] {
  return [
    {
      instruction:
        'Separe os alimentos nas quantidades da lista. Os pesos crus e cozidos não são intercambiáveis.',
    },
    ...dish.ingredients
      .filter((item) => !dish.sides.includes(item))
      .map((item) => ({
        instruction: `Prepare ${item.label} do jeito que você já faz, sem acrescentar óleo, molho ou outro alimento fora da lista.`,
      })),
    ...(dish.sides.length
      ? [{ instruction: `Sirva à parte: ${dish.sides.map((item) => item.label).join('; ')}.` }]
      : []),
    {
      instruction:
        'Monte o prato como na foto, com todos os itens da lista. Preparar não registra consumo; confirme depois no detalhe da refeição.',
    },
  ];
}

type FoodIngredient = ListedIngredient & { foodId: string };

function listedIngredients(items: readonly ItemDoPrato[]): FoodIngredient[] {
  return items.flatMap((item) => {
    const foodId = item.food?.id;
    const name = item.food?.name;
    if (!foodId || !name || !(Number(item.quantity) > 0)) return [];
    const unit = item.unit ?? item.food?.serving_unit ?? 'g';
    const quantity = Number(item.quantity);
    return [{ id: item.id, foodId, name, quantity, unit, label: `${quantity} ${unit} de ${name}` }];
  });
}

function toOption(
  dish: CatalogDish,
  listed: readonly FoodIngredient[],
  complete: boolean
): DishOption {
  const inDish = new Set(dish.foodIds);
  const ingredients = listed.map(({ foodId: _, ...ingredient }): ListedIngredient => ingredient);
  return {
    id: dish.id,
    title: dish.title,
    imageUrl: dish.imageUrl,
    exact: complete && listed.every((item) => inDish.has(item.foodId)),
    ingredients,
    sides: ingredients.filter((_, index) => !inDish.has(listed[index].foodId)),
  };
}
