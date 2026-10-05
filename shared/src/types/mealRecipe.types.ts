export type FoodFamily =
  | "chicken"
  | "beef"
  | "fish"
  | "rice"
  | "beans"
  | "vegetable"
  | "sweet_potato"
  | "egg"
  | "bread"
  | "banana"
  | "apple"
  | "olive_oil"
  | "yogurt"
  | "oats"
  | "coffee"
  | "whey";
export type FoodState = "raw" | "cooked" | "ready" | "unknown";

export interface MealCookingStep {
  instruction: string;
  timerSeconds?: number;
}

export interface MealImageAsset {
  id: string;
  version: number;
  path: string;
  bytes: number;
  sha256: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
}

export interface MealImageManifest {
  version: 1;
  assets: MealImageAsset[];
}

export interface MealImage extends MealImageAsset {
  url: string;
}

export interface RecipeDefinition {
  id: string;
  imageId: string;
  title: string;
  description: string;
  minutes: number;
  equipment: string;
  required: readonly FoodFamily[];
  excluded?: readonly FoodFamily[];
  separate?: readonly FoodFamily[];
  states?: Partial<Record<FoodFamily, FoodState>>;
  steps: readonly MealCookingStep[];
}

export interface MealRecipeCatalog {
  version: 1;
  recipes: RecipeDefinition[];
  images: MealImage[];
}
