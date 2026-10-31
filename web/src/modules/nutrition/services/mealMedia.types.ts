import type { MealImage, RecipeDefinition } from "@elevapro/shared";

export interface MealMediaOverview {
  catalog: {
    version: 1;
    images: MealImage[];
    recipes: Pick<RecipeDefinition, "imageId" | "title">[];
  };
  totalImages: number;
  page: number;
  pageSize: number;
  backupImageCount: number;
  delivery: "unconfigured" | "external";
  destinations: { imagekit: boolean };
}
