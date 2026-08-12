import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Consulta do catálogo de alimentos para o coach de nutrição.
 *
 * **Sem filtro por categoria, de propósito.** O catálogo tem 44 alimentos e
 * `foods.category` é `NULL` nos 44 — uma ferramenta que filtrasse por
 * "proteínas" ou "carboidratos" devolveria zero em toda chamada, e o modelo
 * concluiria que o catálogo está vazio. Foi exatamente o que aconteceu com
 * `muscle_group` no coach de treino, e custou dois dias para aparecer.
 *
 * A busca é por nome. Categorizar os alimentos é curadoria, não código.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(term: string): string {
  return term.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

export interface FoodRow {
  id: string;
  name: string;
  serving_size: string | number;
  serving_unit: string;
  calories: string | number | null;
  protein: string | number | null;
  carbs: string | number | null;
  fat: string | number | null;
}

export interface FoodQueryResult {
  foods: FoodRow[];
  /** Quantos existem no filtro — o modelo precisa saber se está vendo tudo. */
  total: number;
}

/** Cabe o catálogo inteiro: são 44 alimentos. */
const MAX_RESULTS = 60;

const COLUNAS = "id, name, serving_size, serving_unit, calories, protein, carbs, fat";

/**
 * Alimentos do catálogo, por nome ou todos.
 *
 * @example
 * await queryFoods({ search_term: "frango" });
 * await queryFoods({}); // o catálogo inteiro, para montar um plano do zero
 */
export async function queryFoods(input: { search_term?: string }): Promise<FoodQueryResult> {
  let query = supabaseAdmin
    .from("foods")
    .select(COLUNAS, { count: "exact" })
    .order("name")
    .limit(MAX_RESULTS);

  if (input.search_term) query = query.ilike("name", `%${input.search_term}%`);

  const { data, error, count } = await query;

  // Erro tem que subir: indistinguível de "não achei nada" é o que fez o coach
  // de treino afirmar com convicção que o catálogo estava vazio.
  if (error) throw error;

  return { foods: (data ?? []) as unknown as FoodRow[], total: count ?? 0 };
}

/**
 * Quais destes nomes não existem no catálogo.
 *
 * `diet_meal_items.food_id` é `NOT NULL` com `ON DELETE restrict`: não existe
 * item de refeição em texto livre. Sem esta checagem antes de guardar a
 * proposta, o especialista aprova cinco alimentos e recebe três.
 *
 * Lê o catálogo inteiro em vez de filtrar por `in`, porque o modelo reescreve a
 * caixa e o acento do que leu — a mesma lição de `unknownExerciseNames`.
 */
export async function unknownFoodNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  const { data, error } = await supabaseAdmin.from("foods").select("name");
  if (error) throw error;

  const existentes = new Set(((data ?? []) as { name: string }[]).map((f) => normalize(f.name)));
  return names.filter((n) => !existentes.has(normalize(n)));
}

/** Nome → id, normalizado, para a gravação casar com o que o modelo escreveu. */
export async function foodIdsByName(names: string[]): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();

  const { data, error } = await supabaseAdmin.from("foods").select("id, name");
  if (error) throw error;

  const porNome = new Map<string, string>();
  for (const f of (data ?? []) as { id: string; name: string }[]) {
    porNome.set(normalize(f.name), f.id);
  }

  const resultado = new Map<string, string>();
  for (const n of names) {
    const id = porNome.get(normalize(n));
    if (id) resultado.set(n, id);
  }
  return resultado;
}
