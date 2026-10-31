import { type CatalogDish, readAllPages } from "@elevapro/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

interface PublishedDishRow {
  id: string;
  title: string;
  image: { storage_path: string; delivery_base_url: string } | null;
  ingredients: { food_id: string; order_index: number }[];
}

// O catálogo publicado é igual para todo leitor e muda só no deploy: recarregar
// ~8 páginas a cada abertura do cardápio seria custo sem ganho.
const CACHE_TTL_MS = 10 * 60_000;
let cached: { at: number; base: string; dishes: CatalogDish[] } | null = null;

/**
 * Pratos publicados do banco, com a foto resolvida e os alimentos que o compõem.
 * Lê sob a RLS de quem chamou: rascunho nunca entra, nem para admin.
 *
 * @example const dishes = await loadPublishedMealDishes(clienteDoTitular(request), base);
 */
export async function loadPublishedMealDishes(
  client: SupabaseClient,
  base = "/",
  now = Date.now(),
): Promise<CatalogDish[]> {
  if (cached && cached.base === base && now - cached.at < CACHE_TTL_MS) return cached.dishes;
  const rows = await readAllPages<PublishedDishRow>((from, to) =>
    client
      .from("meal_dishes")
      .select(
        "id, title, image:media_assets!inner(storage_path, delivery_base_url), ingredients:meal_dish_ingredients(food_id, order_index)",
      )
      .eq("status", "published")
      .order("id")
      .range(from, to)
      .returns<PublishedDishRow[]>(),
  );
  const dishes = rows.flatMap((row) => toCatalogDish(row, base));
  cached = { at: now, base, dishes };
  return dishes;
}

function toCatalogDish(row: PublishedDishRow, base: string): CatalogDish[] {
  if (!row.image || !row.ingredients.length) return [];
  // A base configurada vence a do registro: trocar de provedor é mudar uma
  // variável, como nas fotos do catálogo fixo.
  const origin = base === "/" ? row.image.delivery_base_url : base;
  return [
    {
      id: row.id,
      title: row.title,
      imageUrl: `${origin.replace(/\/$/, "")}/${row.image.storage_path}`,
      foodIds: [...row.ingredients]
        .sort((a, b) => a.order_index - b.order_index)
        .map((ingredient) => ingredient.food_id),
    },
  ];
}

/** Só para teste: o cache vive no processo. */
export function clearPublishedMealDishesCache(): void {
  cached = null;
}
