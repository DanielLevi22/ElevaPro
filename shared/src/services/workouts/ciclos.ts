import type { SupabaseClient } from "@supabase/supabase-js";
import type { Periodization, TrainingStatus } from "../../types/workouts.types";

/**
 * Um ciclo do aluno como a lista de periodizações o mostra: o ciclo, quantas
 * fases e treinos tem, e a fase em andamento.
 */
export interface CicloDoAluno {
  periodizacao: Periodization;
  fases: number;
  treinos: number;
  /** A fase ativa, com a posição dela no ciclo. Nula fora de um ciclo em andamento. */
  faseAtual: { numero: number; nome: string } | null;
}

const COLUNAS_DO_CICLO =
  "id, specialist_id, student_id, name, objective, status, start_date, end_date, created_at, updated_at";

interface LinhaDaFase {
  id: string;
  periodization_id: string;
  name: string;
  status: TrainingStatus;
  order_index: number;
}

export const criarServicoDeCiclos = (supabase: SupabaseClient) => ({
  /**
   * Os ciclos do aluno, do mais recente ao mais antigo, com as contagens que a
   * lista mostra.
   *
   * Três consultas, e não uma por ciclo: ciclos, as fases de todos eles e os
   * treinos de todas as fases. Das fases e dos treinos só vêm as chaves e o que
   * a lista escreve — nome e posição da fase —, e nunca a prescrição.
   *
   * @example
   * const ciclos = await service.fetchStudentCycles(aluno.id);
   */
  fetchStudentCycles: async (studentId: string): Promise<CicloDoAluno[]> => {
    const { data: ciclos, error } = await supabase
      .from("training_periodizations")
      .select(COLUNAS_DO_CICLO)
      .eq("student_id", studentId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    if (!ciclos?.length) return [];

    const fases = await fasesDosCiclos(
      supabase,
      (ciclos as Periodization[]).map((c) => c.id),
    );
    const treinosPorFase = await treinosDasFases(
      supabase,
      fases.map((f) => f.id),
    );

    return (ciclos as Periodization[]).map((periodizacao) => {
      const doCiclo = fases
        .filter((f) => f.periodization_id === periodizacao.id)
        .sort((a, b) => a.order_index - b.order_index);
      const indiceAtivo = doCiclo.findIndex((f) => f.status === "active");
      return {
        periodizacao,
        fases: doCiclo.length,
        treinos: doCiclo.reduce((soma, f) => soma + (treinosPorFase.get(f.id) ?? 0), 0),
        faseAtual:
          indiceAtivo === -1 ? null : { numero: indiceAtivo + 1, nome: doCiclo[indiceAtivo].name },
      };
    });
  },
});

async function fasesDosCiclos(supabase: SupabaseClient, ids: string[]): Promise<LinhaDaFase[]> {
  const { data, error } = await supabase
    .from("training_plans")
    .select("id, periodization_id, name, status, order_index")
    .in("periodization_id", ids);
  if (error) throw error;
  return (data ?? []) as LinhaDaFase[];
}

async function treinosDasFases(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, number>> {
  const contagem = new Map<string, number>();
  if (ids.length === 0) return contagem;
  const { data, error } = await supabase
    .from("workouts")
    .select("training_plan_id")
    .in("training_plan_id", ids);
  if (error) throw error;
  for (const { training_plan_id } of (data ?? []) as { training_plan_id: string | null }[]) {
    if (training_plan_id) contagem.set(training_plan_id, (contagem.get(training_plan_id) ?? 0) + 1);
  }
  return contagem;
}
