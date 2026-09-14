import type { SupabaseClient } from "@supabase/supabase-js";

/** O total de um dia, como a tela de aderência lê. */
export interface AguaDoDia {
  /** `YYYY-MM-DD`, no calendário do aluno. */
  date: string;
  water_ml: number;
}

/** A faixa do CHECK `hydration_daily_water_ml_plausible` (0052). */
const MAXIMO_DO_DIA_ML = 10000;

/**
 * A água do dia do aluno: um total por dia, em ml.
 *
 * Gravar exige consentimento de saúde vigente — a RLS da `0052` recusa sem ele,
 * e o erro sobe para quem chama. Nenhum especialista lê esta tabela.
 *
 * @example
 * const agua = createHidratacao(supabase);
 * await agua.gravarDia(alunoId, "2026-09-13", 1500);
 */
export const createHidratacao = (supabase: SupabaseClient) => ({
  /** O total do dia; dia sem registro vale zero. */
  lerDia: async (alunoId: string, data: string): Promise<number> => {
    const { data: linha, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("hydration_daily")
      .select("water_ml")
      .eq("student_id", alunoId)
      .eq("date", data)
      .maybeSingle();
    if (error) throw error;
    return (linha as { water_ml: number } | null)?.water_ml ?? 0;
  },

  /** Os dias com registro no intervalo, inclusivo nas duas pontas. */
  lerIntervalo: async (alunoId: string, inicio: string, fim: string): Promise<AguaDoDia[]> => {
    const { data, error } = await supabase
      .from("hydration_daily")
      .select("date, water_ml")
      .eq("student_id", alunoId)
      .gte("date", inicio)
      .lte("date", fim);
    if (error) throw error;
    return (data ?? []) as AguaDoDia[];
  },

  /**
   * Reescreve o total do dia. Upsert no par (aluno, dia): tocar num copo não
   * cria linha nova, corrige a de hoje (Art. 18, III).
   */
  gravarDia: async (alunoId: string, data: string, ml: number): Promise<void> => {
    if (!Number.isInteger(ml) || ml < 0 || ml > MAXIMO_DO_DIA_ML) {
      throw new Error(
        `água do dia inválida: ${ml} ml; esperado inteiro entre 0 e ${MAXIMO_DO_DIA_ML}`,
      );
    }
    const { error } = await supabase
      .from("hydration_daily")
      .upsert(
        { student_id: alunoId, date: data, water_ml: ml, updated_at: new Date().toISOString() },
        { onConflict: "student_id,date" },
      );
    if (error) throw error;
  },
});
