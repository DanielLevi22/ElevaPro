import { type MealRecipeCatalog, parseMealRecipeCatalog } from '@elevapro/shared';
import { bffUrl, getBff } from '@/shared/bff';

/** Consulta conteúdo genérico sem composição individual. @example loadMealRecipeCatalog(token) */
export async function loadMealRecipeCatalog(token: string): Promise<MealRecipeCatalog> {
  const catalog = parseMealRecipeCatalog(
    await getBff<unknown>('/api/nutrition/recipes', { token })
  );
  return {
    ...catalog,
    images: catalog.images.map((image) => ({
      ...image,
      url: image.url.startsWith('/') ? new URL(image.url, bffUrl('/')).toString() : image.url,
    })),
  };
}
