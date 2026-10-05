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
  image?: MealImage;
  title: string;
  ingredients: RecipeIngredient[];
  steps: readonly MealCookingStep[];
}
