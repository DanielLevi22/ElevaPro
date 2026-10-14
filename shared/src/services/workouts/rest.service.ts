import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestPeriod } from "../../utils/restMode";

const REST_COLUMNS = "id, starts_on, planned_until, ended_on";
/** Pausas antigas não mexem em sequência nem em semana de retorno. */
const LOOKBACK = 20;

/**
 * O Modo Descanso (#376, A8): pausar e voltar, sempre pelas funções da 0092,
 * que pegam o dia no fuso do Brasil. Sem motivo: ele não é gravado.
 *
 * @example const pausas = await createRestService(supabase).recent(user.id);
 */
export const createRestService = (supabase: SupabaseClient) => ({
  /**
   * As pausas mais recentes da pessoa, da mais nova para a mais antiga.
   *
   * @example const pausas = await rests.recent(user.id);
   */
  recent: async (studentId: string): Promise<RestPeriod[]> => {
    const { data, error } = await supabase
      .from("rest_periods")
      .select(REST_COLUMNS)
      .eq("student_id", studentId)
      .order("starts_on", { ascending: false })
      .limit(LOOKBACK);
    if (error) throw error;
    return (data ?? []) as RestPeriod[];
  },

  /**
   * Pausa o plano a partir de hoje, até `until` (nulo é "não sei").
   *
   * @example await rests.start("2026-10-21");
   */
  start: async (until: string | null): Promise<RestPeriod> => {
    const { data, error } = await supabase.rpc("start_rest", { p_until: until });
    if (error) throw error;
    return data as RestPeriod;
  },

  /**
   * Encerra a pausa hoje: "Voltar agora".
   *
   * @example await rests.end();
   */
  end: async (): Promise<RestPeriod> => {
    const { data, error } = await supabase.rpc("end_rest");
    if (error) throw error;
    return data as RestPeriod;
  },
});

export type RestService = ReturnType<typeof createRestService>;
