import type { SupabaseClient } from "@supabase/supabase-js";
import type { Exercise, ExerciseSwapScope } from "../../types/workouts.types";
import { readTrainingPlace, trainsAtGym } from "../../utils/trainingPlace";

/** Quantas alternativas a folha "Trocar exercício" oferece (desenho 6d). */
export const SWAP_ALTERNATIVES = 3;

/** Onde a pessoa treina, e o que ela pediu para ver menos. */
export interface SwapContext {
  /** `true` em casa ou ao ar livre; `false` na academia; `null` quando não se sabe. */
  atHome: boolean | null;
  avoided: string[];
}

const HOME_VENUES = new Set(["casa", "ambos"]);

/**
 * As alternativas a um exercício: mesmo músculo e mesmo tipo de trabalho, do
 * catálogo oficial, que dê para fazer onde a pessoa treina, e sem o que ela
 * pediu para ver menos. Primeiro as verificadas.
 *
 * @example exerciseAlternatives(catalogo, remadaCurvada, { atHome: true, avoided: [] })
 * // [Remada com halteres, Remada com elástico, Remada unilateral apoiada]
 */
export function exerciseAlternatives(
  catalog: readonly Exercise[],
  current: Exercise,
  context: SwapContext,
): Exercise[] {
  return catalog
    .filter((exercise) => exercise.id !== current.id && exercise.created_by === null)
    .filter((exercise) => exercise.muscle_group === current.muscle_group)
    .filter((exercise) => exercise.category === current.category)
    .filter((exercise) => !context.avoided.includes(exercise.id))
    .filter((exercise) => context.atHome !== true || HOME_VENUES.has(exercise.venue))
    .sort(
      (a, b) => Number(b.is_verified) - Number(a.is_verified) || a.name.localeCompare(b.name, "pt"),
    )
    .slice(0, SWAP_ALTERNATIVES);
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

/**
 * A troca de exercício (#365, desenho 6d).
 *
 * "Só hoje" não passa por aqui: muda a sessão e mais nada. "Sempre" e
 * "Recomendar menos" só existem para o Praticante, em treino sem especialista;
 * o banco confere isso de novo (`swap_workout_exercise`, 0085).
 */
export const createExerciseSwapService = (supabase: SupabaseClient) => ({
  /**
   * Onde a pessoa treina e o que ela evita, lidos campo a campo da anamnese:
   * nunca as respostas inteiras, que têm dado de saúde.
   *
   * @example const contexto = await swap.contextOf(user.id);
   */
  contextOf: async (studentId: string): Promise<SwapContext> => {
    const { data, error } = await supabase
      .from("student_anamnesis")
      .select("place:responses->gym_type, avoided:responses->avoided_exercises")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;
    const place = readTrainingPlace(data?.place);
    return {
      atHome: place === null ? null : !trainsAtGym(place),
      avoided: strings(data?.avoided),
    };
  },

  /** @example const opcoes = await swap.alternativesTo(item.exercise, contexto); */
  alternativesTo: async (current: Exercise, context: SwapContext): Promise<Exercise[]> => {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("muscle_group", current.muscle_group ?? "")
      .eq("category", current.category)
      .is("created_by", null);
    if (error) throw error;
    return exerciseAlternatives((data ?? []) as Exercise[], current, context);
  },

  /**
   * Troca o exercício no plano, para as próximas sessões também.
   *
   * @example await swap.swapForever(item.id, alternativa.id);
   */
  swapForever: async (workoutExerciseId: string, exerciseId: string): Promise<void> => {
    const { error } = await supabase.rpc("swap_workout_exercise", {
      p_workout_exercise_id: workoutExerciseId,
      p_exercise_id: exerciseId,
    });
    if (error) throw error;
  },

  /**
   * Registra a troca num treino prescrito, para o especialista ver no
   * Acompanhamento e no briefing (0086). O banco tira o aluno do JWT e o
   * exercício de origem do item: o cliente não escolhe nenhum dos dois.
   *
   * @example await swap.recordSwap(item.id, alternativa.id, "today");
   */
  recordSwap: async (
    workoutExerciseId: string,
    exerciseId: string,
    scope: ExerciseSwapScope,
  ): Promise<void> => {
    const { error } = await supabase.rpc("record_exercise_swap", {
      p_workout_exercise_id: workoutExerciseId,
      p_to_exercise_id: exerciseId,
      p_scope: scope,
    });
    if (error) throw error;
  },

  /**
   * Guarda o exercício entre os que a montagem do plano evita. Grava só
   * `responses`: o `save` da anamnese regravaria `completed_at` e tiraria a
   * pessoa do plano pronto.
   *
   * @example await swap.avoid(user.id, item.exercise_id);
   */
  avoid: async (studentId: string, exerciseId: string): Promise<void> => {
    const { data, error } = await supabase
      .from("student_anamnesis")
      .select("responses")
      .eq("student_id", studentId)
      .single();
    if (error) throw error;
    const responses = (data.responses ?? {}) as Record<string, unknown>;
    const avoided = strings(responses.avoided_exercises);
    if (avoided.includes(exerciseId)) return;
    const { error: updateError } = await supabase
      .from("student_anamnesis")
      .update({
        responses: { ...responses, avoided_exercises: [...avoided, exerciseId] },
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId);
    if (updateError) throw updateError;
  },
});
