import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Consulta do catálogo de alimentos para o assistente de nutrição.
 *
 * O filtro por categoria existia como ideia e não como código: `foods.category`
 * era `NULL` em todas as linhas, e uma ferramenta que filtrasse por "proteínas"
 * devolveria zero em toda chamada — o mesmo que `muscle_group` fez no
 * assistente de treino. A curadoria foi feita na 0047 e no seed, e o filtro
 * passou a poder existir.
 *
 * Categoria que não existe responde dizendo o que existe, nunca lista vazia:
 * lista vazia é o que faz o modelo anunciar catálogo vazio com o catálogo
 * cheio.
 */

/** As categorias que o CHECK da 0047 aceita. */
export const FOOD_CATEGORIES = [
  "proteina",
  "carboidrato",
  "leguminosa",
  "fruta",
  "hortalica",
  "gordura",
  "laticinio",
  "bebida",
  "suplemento",
] as const;

export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

/** Como a pessoa fala, para o valor que o banco guarda. */
const CATEGORY_SYNONYMS: Record<string, FoodCategory> = {
  proteinas: "proteina",
  proteico: "proteina",
  carne: "proteina",
  carnes: "proteina",
  peixe: "proteina",
  peixes: "proteina",
  carboidratos: "carboidrato",
  carbo: "carboidrato",
  carbos: "carboidrato",
  cereal: "carboidrato",
  cereais: "carboidrato",
  leguminosas: "leguminosa",
  feijao: "leguminosa",
  frutas: "fruta",
  hortalicas: "hortalica",
  verdura: "hortalica",
  verduras: "hortalica",
  legume: "hortalica",
  legumes: "hortalica",
  vegetal: "hortalica",
  vegetais: "hortalica",
  gorduras: "gordura",
  oleaginosa: "gordura",
  oleaginosas: "gordura",
  laticinios: "laticinio",
  lacteo: "laticinio",
  lacteos: "laticinio",
  bebidas: "bebida",
  suplementos: "suplemento",
};

const COMBINING_MARKS = /[̀-ͯ]/g;

function normalize(term: string): string {
  return term.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

export interface FoodRow {
  id: string;
  name: string;
  category: string | null;
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
  /** Preenchido quando a categoria pedida não existe, com as que existem. */
  unknownCategory?: { requested: string; available: readonly string[] };
}

/**
 * Traduz o termo do modelo para a categoria do banco, ou `null` se não conhece.
 *
 * Não reconhecer é resposta, não ausência: é o que deixa a ferramenta dizer "não
 * conheço, o que existe é X" em vez de devolver vazio e o modelo concluir que
 * não há alimento.
 */
export function resolveFoodCategory(term: string): FoodCategory | null {
  const normalized = normalize(term);
  if (normalized.length === 0) return null;
  return FOOD_CATEGORIES.find((c) => c === normalized) ?? CATEGORY_SYNONYMS[normalized] ?? null;
}

/**
 * Teto de uma consulta. O catálogo passou de 44 para quase 180 e não cabe mais
 * inteiro numa resposta — por isso `total` vem junto, dizendo ao modelo quando
 * ele está vendo só uma parte e precisa filtrar.
 */
const MAX_RESULTS = 60;

const COLUNAS = "id, name, category, serving_size, serving_unit, calories, protein, carbs, fat";

/**
 * Alimentos do catálogo, por nome ou todos.
 *
 * @example
 * await queryFoods({ category: "proteinas" }); // sinônimo resolve sozinho
 * await queryFoods({ search_term: "frango" });
 */
export async function queryFoods(input: {
  search_term?: string;
  category?: string;
}): Promise<FoodQueryResult> {
  const category = input.category ? resolveFoodCategory(input.category) : null;
  if (input.category && !category) {
    return {
      foods: [],
      total: 0,
      unknownCategory: { requested: input.category, available: FOOD_CATEGORIES },
    };
  }

  let query = supabaseAdmin
    .from("foods")
    .select(COLUNAS, { count: "exact" })
    .order("name")
    .limit(MAX_RESULTS);

  if (category) query = query.eq("category", category);
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
