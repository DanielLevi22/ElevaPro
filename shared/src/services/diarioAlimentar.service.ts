import type { SupabaseClient } from "@supabase/supabase-js";
import type { DietMealItem, ItemRegistrado } from "../types/nutrition.types";
import { itensComExtra } from "../utils/diarioAlimentar";

export interface RegistroDeItemExtra {
  alunoId: string;
  planoId: string;
  refeicaoId: string;
  /** `YYYY-MM-DD` do dia em que o aluno comeu, no calendário dele. */
  data: string;
  /** O prato do plano, copiado quando ainda não há registro. */
  doPlano: DietMealItem[];
  /** Um ou mais itens: o prato do scan separado em componentes entra um por um. */
  extras: Omit<ItemRegistrado, "id">[];
}

/**
 * O que o aluno comeu além do prato do plano: o alimento da busca, o prato do
 * scan, a sugestão do assistente.
 *
 * @example
 * await createDiarioAlimentar(supabase).registrarItemExtra({ alunoId, planoId, refeicaoId,
 *   data: "2026-09-13", doPlano, extras: [{ quantity: 1, unit: "porção", food, origem: "scan" }] });
 */
export const createDiarioAlimentar = (supabase: SupabaseClient) => {
  /** O registro da refeição na data, se já existe — lido do banco, não da tela. */
  const lerRegistro = async (alunoId: string, refeicaoId: string, data: string) => {
    const { data: registro, error } = await supabase
      // Campos nomeados: tabela sensível pela LGPD_COMPLIANCE.md.
      .from("meal_logs")
      .select("id, actual_items")
      .eq("student_id", alunoId)
      .eq("diet_meal_id", refeicaoId)
      .eq("logged_date", data)
      .maybeSingle();
    if (error) throw error;
    return registro as { id: string; actual_items: unknown } | null;
  };

  const criarRegistro = async ({ alunoId, planoId, refeicaoId, data }: RegistroDeItemExtra) => {
    const { data: criado, error } = await supabase
      .from("meal_logs")
      .insert({
        student_id: alunoId,
        diet_plan_id: planoId,
        diet_meal_id: refeicaoId,
        logged_date: data,
        completed: false,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (criado as { id: string }).id;
  };

  return {
    /**
     * Acrescenta os itens ao que o aluno comeu na refeição, sem apagar a troca que
     * já estiver lá, e sem marcar a refeição: comer o extra não é comer o prato.
     */
    registrarItemExtra: async (registro: RegistroDeItemExtra): Promise<void> => {
      const existente = await lerRegistro(registro.alunoId, registro.refeicaoId, registro.data);
      const agora = Date.now();
      const itens = registro.extras.reduce<unknown>(
        (atuais, extra, indice) =>
          itensComExtra(atuais, registro.doPlano, { ...extra, id: `extra_${agora}_${indice}` }),
        existente?.actual_items,
      );
      const logId = existente?.id ?? (await criarRegistro(registro));

      const { error } = await supabase
        .from("meal_logs")
        .update({ actual_items: itens })
        .eq("id", logId);
      if (error) throw error;
    },
  };
};
