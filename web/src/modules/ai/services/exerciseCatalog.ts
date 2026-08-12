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
  muscle_group?: string;
  search_term?: string;
}

export interface ExerciseQueryResult {
  exercises: { name: string; muscle_group: string }[];
  /** Quantos existem no filtro — o modelo precisa saber se está vendo tudo. */
  total: number;
  /** Preenchido quando o grupo pedido não existe, com os que existem. */
  unknownGroup?: { requested: string; available: readonly string[] };
}

/** Teto alto o bastante para caber um grupo inteiro (o maior tem 12). */
const MAX_RESULTS = 40;

export async function queryExercises(input: ExerciseQueryInput): Promise<ExerciseQueryResult> {
  let groups: MuscleGroup[] = [];

  if (input.muscle_group) {
    groups = resolveMuscleGroups(input.muscle_group);
    if (groups.length === 0) {
      // Devolver lista vazia aqui foi o que fez o coach afirmar que o banco
      // estava vazio. Dizer o que existe deixa o modelo se corrigir sozinho.
      return {
        exercises: [],
        total: 0,
        unknownGroup: { requested: input.muscle_group, available: MUSCLE_GROUPS },
      };
    }
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
