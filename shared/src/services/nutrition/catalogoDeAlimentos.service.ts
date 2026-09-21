import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateFoodInput, Food } from "../../types/nutrition.types";

/**
 * O catálogo de alimentos: busca, categoria e alimento criado pelo especialista.
 *
 * Mora fora do `nutrition.service.ts` pelo tamanho, e não por fronteira: o
 * `createNutritionService` o espalha de volta, e quem chama não vê diferença.
 *
 * @example
 * const frangos = await createCatalogoDeAlimentos(supabase).searchFoods("frango");
 */
/** As colunas do tipo `Food`, nomeadas: o `search_vector` do trigger não sai da tabela. */
const COLUNAS_DO_ALIMENTO =
  "id, name, category, serving_size, serving_unit, calories, protein, carbs, fat, fiber, source, is_custom, created_by, created_at";

export const createCatalogoDeAlimentos = (supabase: SupabaseClient) => ({
  // ── Foods ──────────────────────────────────────────────────────────────────

  searchFoods: async (query: string, page = 0, pageSize = 10): Promise<Food[]> => {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    // Uses ilike for broad partial matching. After migration 0002 is applied on all
    // environments, switch to: .or(`name.ilike.%${query}%,search_vector.fts.${query}`)
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .ilike("name", `%${query}%`)
      .range(from, to);
    if (error) throw error;
    return (data || []) as Food[];
  },

  /**
   * Os alimentos de uma categoria do catálogo — os candidatos a equivalente na
   * troca do aluno.
   *
   * @example await nutrition.fetchFoodsByCategory(frango.category, 60)
   */
  fetchFoodsByCategory: async (category: string, limit = 60): Promise<Food[]> => {
    const { data, error } = await supabase
      .from("foods")
      .select(COLUNAS_DO_ALIMENTO)
      .eq("category", category)
      .limit(limit);
    if (error) throw error;
    return (data || []) as Food[];
  },

  fetchFoods: async (limit = 50): Promise<Food[]> => {
    const { data, error } = await supabase.from("foods").select("*").limit(limit);
    if (error) throw error;
    return (data || []) as Food[];
  },

  createFood: async (input: CreateFoodInput & { created_by?: string }): Promise<Food> => {
    const { data, error } = await supabase
      .from("foods")
      .insert({ ...input, is_custom: true, source: input.source ?? "Manual" })
      .select()
      .single();
    if (error) throw error;
    return data as Food;
  },
});
