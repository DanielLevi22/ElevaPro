import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type DietaryRestriction,
  hasUnmappedDietaryNotes,
  restrictionsFromAnamnesis,
} from "../../utils/dietaryRestrictions";

export interface DietaryRestrictionHint {
  suggested: DietaryRestriction[];
  /** A anamnese diz algo sobre alimentação que não vira etiqueta. */
  hasOtherNotes: boolean;
}

/**
 * O que a tela de metas sugere a partir do que o aluno já declarou (#337).
 * Devolve só o que foi derivado: a resposta da anamnese não sai daqui.
 */
export const createDietPlanSuggestions = (supabase: SupabaseClient) => ({
  /**
   * As etiquetas de restrição que a anamnese sugere, e se ela diz mais do que
   * elas — "Diabetes", por exemplo, fica só na anamnese.
   *
   * @example
   * const { suggested, hasOtherNotes } = await nutritionService.fetchDietaryRestrictionHint(id);
   */
  fetchDietaryRestrictionHint: async (studentId: string): Promise<DietaryRestrictionHint> => {
    const { data, error } = await supabase
      .from("student_anamnesis")
      .select("dietary_restrictions:responses->dietary_restrictions")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;

    const answer = (data as { dietary_restrictions?: unknown } | null)?.dietary_restrictions;
    return {
      suggested: restrictionsFromAnamnesis(answer),
      hasOtherNotes: hasUnmappedDietaryNotes(answer),
    };
  },
});
