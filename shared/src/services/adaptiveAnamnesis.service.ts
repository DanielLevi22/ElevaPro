import type { SupabaseClient } from "@supabase/supabase-js";
import { splitMeasurementAnswers } from "../utils/anamnesisMeasurement";
import { createMeasurementService } from "./measurement.service";

/**
 * Gravar a anamnese adaptativa (issue #312): as respostas vão para
 * `student_anamnesis`, e as medidas de partida viram a primeira Assessment
 * declarada do Praticante.
 *
 * A medida é criada uma vez só, na conclusão: editar a anamnese depois não cria
 * outra, porque a série de medidas passa a seguir o que a pessoa registra pela
 * "Nova medida", e não o cadastro.
 */

export interface SaveAdaptiveAnamnesisInput {
  studentId: string;
  answers: Record<string, unknown>;
  completed: boolean;
  /** Sem especialista ativo. Com especialista, quem mede é ele, e a RLS recusaria. */
  selfGuided: boolean;
}

/** O que aconteceu com a medida de partida. */
export type StartingMeasureOutcome = "created" | "already_measured" | "not_applicable";

export const createAdaptiveAnamnesisService = (supabase: SupabaseClient) => ({
  /**
   * @example
   * await service.save({ studentId: user.id, answers, completed: isLastStep, selfGuided: true });
   */
  save: async (input: SaveAdaptiveAnamnesisInput): Promise<StartingMeasureOutcome> => {
    const { responses, startingMeasure } = splitMeasurementAnswers(input.answers);
    const now = new Date().toISOString();
    const { error } = await supabase.from("student_anamnesis").upsert(
      {
        student_id: input.studentId,
        responses,
        completed_at: input.completed ? now : null,
        updated_at: now,
      },
      { onConflict: "student_id" },
    );
    if (error) throw error;
    if (!input.completed || !input.selfGuided || !startingMeasure) return "not_applicable";
    if (await hasDeclaredMeasurement(supabase, input.studentId)) return "already_measured";
    await createMeasurementService(supabase).declareMeasurement(input.studentId, {
      ...startingMeasure,
      assessed_at: now,
    });
    return "created";
  },
});

async function hasDeclaredMeasurement(
  supabase: SupabaseClient,
  studentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("physical_assessments")
    .select("id")
    .eq("student_id", studentId)
    .eq("measured_by", "self")
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}
