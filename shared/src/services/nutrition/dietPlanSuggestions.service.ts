import type { SupabaseClient } from "@supabase/supabase-js";
import { lerRespostaNumerica, lerRespostaTexto } from "../../utils/anamnese";
import {
  type DietaryRestriction,
  hasUnmappedDietaryNotes,
  restrictionsFromAnamnesis,
} from "../../utils/dietaryRestrictions";
import {
  type DietGoalInputs,
  type DietGoalSuggestion,
  suggestDietGoal,
} from "../../utils/dietGoalSuggestion";

export interface DietaryRestrictionHint {
  suggested: DietaryRestriction[];
  /** A anamnese diz algo sobre alimentação que não vira etiqueta. */
  hasOtherNotes: boolean;
}

interface GoalAnswers {
  age?: unknown;
  gender?: unknown;
  height?: unknown;
  weight?: unknown;
  weekly_frequency?: unknown;
  profession_routine?: unknown;
  main_goal?: unknown;
}

interface LatestMeasure {
  weight_kg: string | number | null;
  height_cm: string | number | null;
}

const SEX_BY_ANSWER: Record<string, "M" | "F"> = { Masculino: "M", Feminino: "F" };

function numberAnswer(entrada: unknown, pergunta: string): number | undefined {
  const lida = lerRespostaNumerica(entrada, pergunta);
  return lida.ok ? lida.valor : undefined;
}

function measured(value: string | number | null | undefined): number | undefined {
  const parsed = value === null || value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// A medida do especialista vale mais que a declarada na anamnese.
function goalInputs(answers: GoalAnswers, measure: LatestMeasure | null): DietGoalInputs {
  return {
    weightKg: measured(measure?.weight_kg) ?? numberAnswer(answers.weight, "weight"),
    heightCm: measured(measure?.height_cm) ?? numberAnswer(answers.height, "height"),
    age: numberAnswer(answers.age, "age"),
    sex: SEX_BY_ANSWER[lerRespostaTexto(answers.gender, "gender") ?? ""],
    trainingDaysPerWeek: numberAnswer(answers.weekly_frequency, "weekly_frequency"),
    routine: lerRespostaTexto(answers.profession_routine, "profession_routine"),
    mainGoal: lerRespostaTexto(answers.main_goal, "main_goal"),
  };
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

  /**
   * A meta diária sugerida pela anamnese e pela última avaliação. Devolve a
   * conta pronta — TMB, GET, meta e macros —, nunca idade e sexo do aluno.
   *
   * @example
   * const suggestion = await nutritionService.fetchDietGoalSuggestion(studentId);
   */
  fetchDietGoalSuggestion: async (studentId: string): Promise<DietGoalSuggestion | null> => {
    const [anamnesis, assessment] = await Promise.all([
      supabase
        .from("student_anamnesis")
        .select(
          "age:responses->age, gender:responses->gender, height:responses->height, weight:responses->weight, weekly_frequency:responses->weekly_frequency, profession_routine:responses->profession_routine, main_goal:responses->main_goal",
        )
        .eq("student_id", studentId)
        .maybeSingle(),
      supabase
        .from("physical_assessments")
        .select("weight_kg, height_cm")
        .eq("student_id", studentId)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (anamnesis.error) throw anamnesis.error;
    if (assessment.error) throw assessment.error;
    if (!anamnesis.data) return null;

    return suggestDietGoal(
      goalInputs(anamnesis.data as GoalAnswers, assessment.data as LatestMeasure | null),
    );
  },
});
