import type {
  FoodFamily,
  FoodState,
  MealCookingStep,
  MealImage,
  RecipeDefinition,
} from '@elevapro/shared';

export type { FoodFamily, FoodState, MealCookingStep, RecipeDefinition } from '@elevapro/shared';

export interface RecipeIngredient {
  id: string;
  name: string;
  label: string;
  family: FoodFamily;
  state: FoodState;
  quantity: number;
  unit: string;
}

/** O que a lista de porções mostra; vale também para alimento sem família. */
export type ListedIngredient = Pick<
  RecipeIngredient,
  'id' | 'name' | 'label' | 'quantity' | 'unit'
>;

/**
 * Prato importado que cabe na refeição. Como no prato fixo, `ingredients` são
 * todas as porções da refeição e `sides` as que o prato não leva.
 */
export interface DishOption {
  id: string;
  title: string;
  imageUrl: string;
  exact: boolean;
  ingredients: ListedIngredient[];
  sides: ListedIngredient[];
}

export interface MealRecipeOption extends RecipeDefinition {
  ingredients: RecipeIngredient[];
  sides: RecipeIngredient[];
}

export interface RecipeMatchResult {
  ingredients: RecipeIngredient[];
  options: MealRecipeOption[];
  unavailableReason: string | null;
}

export interface MealPreparation {
  image?: Pick<MealImage, 'url'>;
  title: string;
  ingredients: readonly ListedIngredient[];
  steps: readonly MealCookingStep[];
}
