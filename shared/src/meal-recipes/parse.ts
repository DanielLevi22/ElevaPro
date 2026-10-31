import type { MealRecipeCatalog } from "../types/mealRecipe.types";
import { mealRecipeCatalogSchema } from "./schema";

/** Recusa catálogo incompleto em vez de sugerir preparo inválido. @example parseMealRecipeCatalog(response) */
export function parseMealRecipeCatalog(input: unknown): MealRecipeCatalog {
  const parsed = mealRecipeCatalogSchema.safeParse(input);
  if (!parsed.success)
    throw new Error("Catálogo inválido: esperado contrato de receitas versão 1.");
  const catalog = parsed.data;
  const imageIds = new Set(catalog.images.map((image) => image.id));
  const recipeIds = new Set(catalog.recipes.map((recipe) => recipe.id));
  if (
    imageIds.size !== catalog.images.length ||
    recipeIds.size !== catalog.recipes.length ||
    catalog.recipes.some((recipe) => !imageIds.has(recipe.imageId))
  )
    throw new Error(
      "Catálogo inválido: esperado IDs únicos e uma imagem cadastrada para cada prato.",
    );
  return catalog;
}
