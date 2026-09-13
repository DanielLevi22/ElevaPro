import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessaoComSeries, SessaoDoHistorico } from "../../types/workouts.types";

/**
 * As leituras do que o aluno já treinou: o histórico, a última execução de um
 * treino e o peso que entra no gasto calórico.
 *
 * Parte do `createWorkoutsService`. Separado de `sessoes.ts` porque aquele
 * grava e este só lê — e tudo aqui toca tabela sensível (`workout_sessions`,
 * `physical_assessments`, `student_anamnesis`), sempre com colunas nomeadas.
 */

/** Campos nomeados: `workout_sessions` é tabela sensível pela LGPD_COMPLIANCE.md. */
const COLUNAS_DO_HISTORICO =
  "id, student_id, workout_id, started_at, completed_at, perceived_exertion, notes, feedback_edited_at, session_type, duration_seconds, active_calories, activity_name, distance_meters, avg_pace_seconds_per_km, created_at, workout:workouts(title), vitals:workout_session_vitals(avg_heart_rate)";

/**
 * Traz a FC média da junção para o nível da sessão.
 *
 * O PostgREST devolve o recurso embutido como objeto quando a chave é única e
 * como lista quando não consegue provar isso — e a diferença muda com a versão.
 * Os dois casos viram o mesmo número, e ausência vira `null`: para o
 * especialista de quem revogou o consentimento a junção volta vazia, e nulo é a
 * resposta certa, não zero.
 */
function achatarVitals(linha: Record<string, unknown>): SessaoDoHistorico {
  const { vitals, ...sessao } = linha;
  const medida = Array.isArray(vitals) ? vitals[0] : vitals;
  const bpm = (medida as { avg_heart_rate?: number } | null | undefined)?.avg_heart_rate;
  return { ...sessao, avg_heart_rate: bpm ?? null } as SessaoDoHistorico;
}

export const criarServicoDeHistorico = (supabase: SupabaseClient) => ({
  /**
   * Todas as sessões do aluno, da mais recente para a mais antiga.
   *
   * @example
   * const sessoes = await service.fetchSessionHistory(aluno.id);
   */
  fetchSessionHistory: async (studentId: string): Promise<SessaoDoHistorico[]> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(COLUNAS_DO_HISTORICO)
      .eq("student_id", studentId)
      .order("completed_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map(achatarVitals);
  },

  /**
   * A última execução concluída de um treino, com as séries.
   *
   * Sem `notes` e sem PSE: quem pede isto quer comparar carga e repetição, e a
   * observação é dado de saúde que não muda nada nessa conta.
   *
   * @example
   * const anterior = await service.fetchUltimaSessaoDoTreino(treino.id, aluno.id);
   */
  fetchUltimaSessaoDoTreino: async (
    workoutId: string,
    studentId: string,
  ): Promise<SessaoComSeries | null> => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        "id, completed_at, exercises:workout_session_exercises(workout_exercise_id, sets:workout_session_sets(set_index, reps_actual, weight_actual, completed))",
      )
      .eq("workout_id", workoutId)
      .eq("student_id", studentId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as SessaoComSeries | null;
  },

  /**
   * O peso do aluno para o gasto calórico, ou `null` quando não há nenhum.
   *
   * Duas origens, nesta ordem: a avaliação física mais recente e, na falta
   * dela, o peso declarado na anamnese — que vale mais que um padrão inventado,
   * porque foi o próprio aluno que informou. Quem chama decide o padrão: um
   * número inventado aqui ficaria indistinguível de um medido.
   *
   * O erro é lido nas duas consultas: o PostgREST devolve `{ data: null, error }`
   * em vez de lançar, e sem isso a RLS negando a anamnese chegaria idêntica a um
   * aluno que nunca a preencheu.
   *
   * @example
   * const pesoKg = (await service.fetchPesoParaGasto(aluno.id)) ?? 70;
   */
  fetchPesoParaGasto: async (studentId: string): Promise<number | null> => {
    const { data: avaliacao, error } = await supabase
      .from("physical_assessments")
      .select("weight_kg")
      .eq("student_id", studentId)
      .not("weight_kg", "is", null)
      .order("assessed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (avaliacao?.weight_kg) return Number(avaliacao.weight_kg);

    // Só `responses`: o peso mora dentro do JSON do questionário.
    const { data: anamnese, error: erroDaAnamnese } = await supabase
      .from("student_anamnesis")
      .select("responses")
      .eq("student_id", studentId)
      .maybeSingle();
    if (erroDaAnamnese) throw erroDaAnamnese;

    const declarado = (anamnese?.responses as Record<string, { value?: unknown }> | null)?.weight
      ?.value;
    return typeof declarado === "number" && declarado > 0 ? declarado : null;
  },
});
