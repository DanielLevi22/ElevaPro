import type { ItemDoPrato } from './consumoDoDia';
import { recipeIngredient } from './recipes/ingredients';
import { currentMealSteps } from './recipes/preparation';
import type {
  MealPreparation,
  RecipeDefinition,
  RecipeIngredient,
  RecipeMatchResult,
} from './recipes/types';

export { dishPreparation, matchCatalogDishes } from './recipes/dishes';
export type {
  DishOption,
  ListedIngredient,
  MealCookingStep,
  MealPreparation,
  MealRecipeOption,
  RecipeIngredient,
  RecipeMatchResult,
} from './recipes/types';

/** Encontra pratos sem alterar alimentos ou porções. @example getMealRecipeOptions(items).options */
export function getMealRecipeOptions(
  items: readonly ItemDoPrato[],
  catalog: readonly RecipeDefinition[] = []
): RecipeMatchResult {
  const ingredients = items
    .map(recipeIngredient)
    .filter((item): item is RecipeIngredient => item !== null);
  if (!items.length || ingredients.length !== items.length)
    return {
      ingredients,
      options: [],
      unavailableReason:
        'Ainda não temos uma receita compatível com todos os alimentos e unidades desta refeição.',
    };
  const options = catalog
    .filter((recipe) => compatibleRecipe(recipe, ingredients))
    .map((recipe) => ({
      ...recipe,
      ingredients,
      sides: ingredients.filter(
        (item) => !recipe.required.includes(item.family) || recipe.separate?.includes(item.family)
      ),
    }));
  return {
    ingredients,
    options,
    unavailableReason: options.length
      ? null
      : 'Não há prato compatível neste catálogo de teste. Confira também se o alimento está descrito como cru ou cozido.',
  };
}

function compatibleRecipe(recipe: RecipeDefinition, ingredients: RecipeIngredient[]): boolean {
  if (ingredients.some((item) => recipe.excluded?.includes(item.family))) return false;
  const requiredPresent = recipe.required.every((family) => {
    const matching = ingredients.filter((item) => item.family === family);
    return (
      matching.length > 0 &&
      matching.every((item) => !recipe.states?.[family] || item.state === recipe.states[family])
    );
  });
  const sides = ingredients.filter((item) => !recipe.required.includes(item.family));
  return requiredPresent && currentMealSteps(sides) !== null;
}

/** Obtém o preparo atual ou de um prato compatível. @example getMealPreparation(items, recipeId) */
export function getMealPreparation(
  items: readonly ItemDoPrato[],
  recipeId?: string,
  catalog: readonly RecipeDefinition[] = []
): MealPreparation | null {
  const match = getMealRecipeOptions(items, catalog);
  if (recipeId) {
    const recipe = match.options.find((option) => option.id === recipeId);
    if (!recipe) return null;
    const sides = recipe.sides.length
      ? [
          { instruction: `Sirva à parte: ${recipe.sides.map((item) => item.label).join('; ')}.` },
          ...(currentMealSteps(recipe.sides)?.slice(1, -1) ?? []),
        ]
      : [];
    return {
      title: recipe.title,
      ingredients: recipe.ingredients,
      steps: [...recipe.steps, ...sides],
    };
  }
  if (!items.length || match.ingredients.length !== items.length) return null;
  const steps = currentMealSteps(match.ingredients);
  return steps ? { title: 'Preparo da refeição', ingredients: match.ingredients, steps } : null;
}
