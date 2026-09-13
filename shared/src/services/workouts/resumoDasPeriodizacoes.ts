import type { SupabaseClient } from "@supabase/supabase-js";
import type { Periodization, TrainingStatus } from "../../types/workouts.types";

/**
 * Uma periodização do aluno como a lista a mostra: a periodização, quantas
 * fases e treinos tem, e a fase em andamento.
 */
export interface ResumoDaPeriodizacao {
  periodizacao: Periodization;
  fases: number;
  treinos: number;
  /** A fase ativa, com a posição dela na periodização. Nula fora de uma periodização ativa. */
  faseAtual: { numero: number; nome: string } | null;
}

const COLUNAS_DA_PERIODIZACAO =
  "id, specialist_id, student_id, name, objective, status, start_date, end_date, created_at, updated_at";

interface LinhaDaFase {
  id: string;
  periodization_id: string;
  name: string;
  status: TrainingStatus;
  order_index: number;
}

export const criarServicoDeResumoDasPeriodizacoes = (supabase: SupabaseClient) => ({
  /**
   * As periodizações do aluno, da mais recente à mais antiga, com as contagens que a
   * lista mostra.
   *
   * Três consultas, e não uma por periodização: as periodizações, as fases de todas elas e os
   * treinos de todas as fases. Das fases e dos treinos só vêm as chaves e o que
   * a lista escreve — nome e posição da fase —, e nunca a prescrição.
   *
   * @example
   * const resumos = await service.fetchStudentPeriodizationSummaries(aluno.id);
   */
  fetchStudentPeriodizationSummaries: async (
    studentId: string,
  ): Promise<ResumoDaPeriodizacao[]> => {
    const { data: periodizacoes, error } = await supabase
      .from("training_periodizations")
      .select(COLUNAS_DA_PERIODIZACAO)
      .eq("student_id", studentId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    if (!periodizacoes?.length) return [];

    const fases = await fasesDasPeriodizacoes(
      supabase,
      (periodizacoes as Periodization[]).map((p) => p.id),
    );
    const treinosPorFase = await treinosDasFases(
      supabase,
      fases.map((f) => f.id),
    );

    return (periodizacoes as Periodization[]).map((periodizacao) => {
      const daPeriodizacao = fases
        .filter((f) => f.periodization_id === periodizacao.id)
        .sort((a, b) => a.order_index - b.order_index);
      const indiceAtivo = daPeriodizacao.findIndex((f) => f.status === "active");
      return {
        periodizacao,
        fases: daPeriodizacao.length,
        treinos: daPeriodizacao.reduce((soma, f) => soma + (treinosPorFase.get(f.id) ?? 0), 0),
        faseAtual:
          indiceAtivo === -1
            ? null
            : { numero: indiceAtivo + 1, nome: daPeriodizacao[indiceAtivo].name },
      };
    });
  },
});

async function fasesDasPeriodizacoes(
  supabase: SupabaseClient,
  ids: string[],
): Promise<LinhaDaFase[]> {
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
