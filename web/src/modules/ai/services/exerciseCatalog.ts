import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Consulta do catálogo de exercícios para o coach.
 *
 * A ferramenta pedia ao modelo para filtrar por "Peito, Costas, Pernas, Ombros,
 * Braços", e o banco guarda em minúsculo, singular e sem acento. `Ombros` e
 * `Braços` devolviam zero — daí a frase que o especialista viu: "ainda não há
 * exercícios de ombros cadastrados", com 57 exercícios no banco e 6 de ombro.
 *
 * Aqui o termo do modelo é resolvido para os grupos que existem, em vez de ir
 * cru para o `ilike`.
 */

/** Os nove grupos que existem em `exercises.muscle_group`. */
export const MUSCLE_GROUPS = [
  "peito",
  "costas",
  "ombro",
  "biceps",
  "triceps",
  "pernas",
  "gluteos",
  "abdomen",
  "cardio",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/**
 * Termos que o modelo (ou o especialista) usa e que não são o valor do banco.
 * "Braços" vira dois grupos porque no banco não existe um só.
 */
const SYNONYMS: Record<string, MuscleGroup[]> = {
  bracos: ["biceps", "triceps"],
  braco: ["biceps", "triceps"],
  ombros: ["ombro"],
  deltoides: ["ombro"],
  deltoide: ["ombro"],
  peitoral: ["peito"],
  dorsal: ["costas"],
  dorsais: ["costas"],
  perna: ["pernas"],
  quadriceps: ["pernas"],
  posterior: ["pernas"],
  gluteo: ["gluteos"],
  abdominal: ["abdomen"],
  abdominais: ["abdomen"],
  core: ["abdomen"],
  aerobico: ["cardio"],
};

/** Marcas de acentuação que o NFD separa da letra base. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Sem acento, sem caixa, sem espaço nas pontas — como o banco guarda. */
function normalize(term: string): string {
  return term.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().trim();
}

/**
 * Traduz o termo do modelo para os grupos reais.
 *
 * Devolve lista vazia quando não reconhece — e é isso que permite responder
 * "não conheço esse grupo, os que existem são X" em vez de "não há exercícios".
 */
export function resolveMuscleGroups(term: string): MuscleGroup[] {
  const normalized = normalize(term);
  if (normalized.length === 0) return [];

  const exact = MUSCLE_GROUPS.find((g) => g === normalized);
  if (exact) return [exact];

  const synonym = SYNONYMS[normalized];
  if (synonym) return synonym;

  // Singular/plural que não está na tabela de sinônimos: "costa" → "costas".
  const partial = MUSCLE_GROUPS.filter((g) => g.startsWith(normalized) || normalized.startsWith(g));
  return partial;
}

export interface ExerciseQueryInput {
  /** Vários de uma vez: uma chamada por grupo custava um turno do modelo cada. */
  muscle_groups?: string[];
  search_term?: string;
}

export interface ExerciseQueryResult {
  exercises: { name: string; muscle_group: string }[];
  /** Quantos existem no filtro — o modelo precisa saber se está vendo tudo. */
  total: number;
  /** Preenchido quando o grupo pedido não existe, com os que existem. */
  unknownGroup?: { requested: string[]; available: readonly string[] };
}

/**
 * Teto alto o bastante para caber vários grupos numa consulta só — uma divisão
 * ABC pede sete de uma vez, e o catálogo inteiro tem 57.
 */
const MAX_RESULTS = 80;

/**
 * Quais destes nomes não existem no catálogo.
 *
 * A gravação casa por nome exato e depois tenta um `ilike`; o que não casa é
 * descartado em silêncio. Sem esta checagem antes, o especialista aprova seis
 * exercícios e recebe quatro, sem nada dizendo o contrário.
 */
export async function unknownExerciseNames(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];

  // Lê o catálogo inteiro em vez de filtrar por `in`: o modelo reescreve a
  // caixa do que leu ("Supino Reto com Barra" para "Supino reto com barra"), e
  // um `in` exato acusaria como inexistente todo exercício que ele propõe. São
  // 57 linhas de duas colunas — comparar normalizado sai mais barato que errar.
  const { data, error } = await supabaseAdmin.from("exercises").select("name");

  if (error) throw error;

  const existentes = new Set(((data ?? []) as { name: string }[]).map((e) => normalize(e.name)));
  return names.filter((n) => !existentes.has(normalize(n)));
}

export async function queryExercises(input: ExerciseQueryInput): Promise<ExerciseQueryResult> {
  const pedidos = input.muscle_groups ?? [];
  const groups = [...new Set(pedidos.flatMap(resolveMuscleGroups))];
  const naoReconhecidos = pedidos.filter((p) => resolveMuscleGroups(p).length === 0);

  if (pedidos.length > 0 && groups.length === 0) {
    // Devolver lista vazia aqui foi o que fez o coach afirmar que o banco
    // estava vazio. Dizer o que existe deixa o modelo se corrigir sozinho.
    return {
      exercises: [],
      total: 0,
      unknownGroup: { requested: naoReconhecidos, available: MUSCLE_GROUPS },
    };
  }

  let query = supabaseAdmin
    .from("exercises")
    .select("name, muscle_group", { count: "exact" })
    .order("name")
    .limit(MAX_RESULTS);

  if (groups.length > 0) query = query.in("muscle_group", groups);
  if (input.search_term) query = query.ilike("name", `%${input.search_term}%`);

  const { data, error, count } = await query;

  // Erro tem que subir: era indistinguível de "não achei nada", e o modelo
  // afirmava com convicção que o catálogo estava vazio.
  if (error) throw error;

  return {
    exercises: (data ?? []) as { name: string; muscle_group: string }[],
    total: count ?? 0,
  };
}
