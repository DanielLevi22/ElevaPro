import type { MealRecipeCatalog } from "@elevapro/shared";

export interface MealMediaOverview {
  catalog: MealRecipeCatalog;
  delivery: "unconfigured" | "external";
  destinations: { imagekit: boolean };
}
