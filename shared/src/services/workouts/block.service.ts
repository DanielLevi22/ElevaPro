import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlockDates } from "../../utils/blockCycle";

/** O bloco ativo do próprio Praticante, com as fases: o treino sabe se é dele. */
export interface ActiveBlock extends BlockDates {
  id: string;
  name: string;
  planIds: string[];
}

interface BlockRow extends BlockDates {
  id: string;
  name: string;
  plans: { id: string }[] | null;
}

/**
 * O ciclo do bloco do Praticante (#376): a descarga da semana 4 e o fim do
 * bloco partem daqui.
 *
 * @example const block = await createBlockService(supabase).activeBlock(user.id);
 */
export const createBlockService = (supabase: SupabaseClient) => ({
  /**
   * A periodização ativa que o próprio Praticante aprovou. A do especialista
   * não entra: o ciclo dela é dele, e o app não muda nada sozinho.
   *
   * @example const block = await blocks.activeBlock(user.id); // null para o Aluno
   */
  activeBlock: async (studentId: string): Promise<ActiveBlock | null> => {
    const { data, error } = await supabase
      .from("training_periodizations")
      .select("id, name, start_date, end_date, plans:training_plans(id)")
      .eq("student_id", studentId)
      .eq("status", "active")
      .is("specialist_id", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const row = data as BlockRow | null;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      planIds: (row.plans ?? []).map((plan) => plan.id),
    };
  },
});

export type BlockService = ReturnType<typeof createBlockService>;
