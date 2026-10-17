import type { SupabaseClient } from "@supabase/supabase-js";

/** Uma troca de exercício do aluno, com os nomes já resolvidos. */
export interface SwapActivity {
  id: string;
  studentId: string;
  at: string;
  /** "Remada curvada → Remada com halteres". */
  summary: string;
  /** "Só no treino de hoje" ou "No plano". */
  scopeLabel: string;
  /** A troca mudou o plano, e não só o treino do dia. */
  inPlan: boolean;
}

interface SwapRow {
  id: string;
  student_id: string;
  swapped_at: string;
  scope: string;
  from_exercise_id: string | null;
  to_exercise_id: string | null;
}

const REMOVED = "exercício removido";

/**
 * As trocas de exercício dos alunos, mais recentes primeiro, para a linha do
 * tempo e o "Aconteceu" do especialista (#365, 6d). Duas consultas, e não um
 * embed: a guarda de colunas confere `.select()` literal contra a tabela.
 *
 * `since` corta pelo instante da troca: o relatório da semana só quer as dela.
 *
 * @example const trocas = await fetchSwapActivity(supabase, [alunoId], 50);
 */
export async function fetchSwapActivity(
  supabase: SupabaseClient,
  studentIds: readonly string[],
  limit: number,
  since?: string,
): Promise<SwapActivity[]> {
  let query = supabase
    .from("exercise_swaps")
    .select("id, student_id, swapped_at, scope, from_exercise_id, to_exercise_id")
    .in("student_id", [...studentIds]);
  if (since) query = query.gte("swapped_at", since);
  const { data, error } = await query.order("swapped_at", { ascending: false }).limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as SwapRow[];
  const names = await exerciseNames(supabase, rows);
  return rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    at: row.swapped_at,
    summary: `${nameOf(names, row.from_exercise_id)} → ${nameOf(names, row.to_exercise_id)}`,
    scopeLabel: row.scope === "today" ? "Só no treino de hoje" : "No plano",
    inPlan: row.scope !== "today",
  }));
}

async function exerciseNames(
  supabase: SupabaseClient,
  rows: readonly SwapRow[],
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(rows.flatMap((row) => [row.from_exercise_id, row.to_exercise_id])),
  ].filter((id): id is string => id !== null);
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("exercises").select("id, name").in("id", ids);
  if (error) throw error;
  return new Map(((data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
}

function nameOf(names: Map<string, string>, id: string | null): string {
  return (id && names.get(id)) || REMOVED;
}
