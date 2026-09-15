import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PHYSICAL_ASSESSMENT_COLUMNS,
  type PhysicalAssessment,
} from "../types/physicalAssessment.types";

/**
 * A medida corporal do aluno (issue #312): ler as duas origens e declarar,
 * corrigir e apagar a própria.
 *
 * A RLS (0056) é quem decide quem pode: só o Praticante declara, só com
 * consentimento, e só a medida `self` se corrige ou apaga. O serviço repete o
 * recorte da origem nos filtros para que um engano de quem chama nunca vire
 * tentativa de mexer na medida do especialista.
 */

/** Os campos que o formulário do aluno grava. Dobra cutânea é do especialista. */
const DECLARED_FIELDS = [
  "assessed_at",
  "weight_kg",
  "height_cm",
  "body_fat_pct",
  "circ_chest",
  "circ_waist",
  "circ_hip",
  "circ_right_arm",
  "circ_left_arm",
  "circ_right_thigh",
  "circ_left_thigh",
  "circ_right_calf",
  "circ_left_calf",
  "circ_shoulder",
  "circ_neck",
] as const;

type DeclaredField = (typeof DECLARED_FIELDS)[number];

/** O que o aluno digita numa medida declarada; o resto a tabela decide. */
export type DeclaredMeasurementInput = Partial<Pick<PhysicalAssessment, DeclaredField>>;

export const createMeasurementService = (supabase: SupabaseClient) => ({
  /**
   * Todas as avaliações do aluno, das duas origens, da mais antiga à mais recente.
   *
   * @example const records = await service.listMeasurements(aluno.id);
   */
  listMeasurements: async (studentId: string): Promise<PhysicalAssessment[]> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
      .eq("student_id", studentId)
      .order("assessed_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PhysicalAssessment[];
  },

  /**
   * Grava a medida que o próprio aluno declarou.
   *
   * @example await service.declareMeasurement(aluno.id, { weight_kg: 78.4, height_cm: 180 });
   */
  declareMeasurement: async (
    studentId: string,
    input: DeclaredMeasurementInput,
  ): Promise<PhysicalAssessment> => {
    const { data, error } = await supabase
      .from("physical_assessments")
      .insert({
        ...onlyDeclaredFields(input),
        student_id: studentId,
        measured_by: "self",
        specialist_id: null,
      })
      .select(PHYSICAL_ASSESSMENT_COLUMNS)
      .single();
    if (error) throw error;
    return data as PhysicalAssessment;
  },

  /**
   * Corrige uma medida declarada (Art. 18, III). A do especialista não passa no filtro.
   *
   * @example await service.correctMeasurement(medida.id, { weight_kg: 78 });
   */
  correctMeasurement: async (id: string, input: DeclaredMeasurementInput): Promise<void> => {
    const { error } = await supabase
      .from("physical_assessments")
      .update(onlyDeclaredFields(input))
      .eq("id", id)
      .eq("measured_by", "self");
    if (error) throw error;
  },

  /**
   * Apaga uma medida declarada (Art. 18, VI). A do especialista não passa no filtro.
   *
   * @example await service.deleteMeasurement(medida.id);
   */
  deleteMeasurement: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("physical_assessments")
      .delete()
      .eq("id", id)
      .eq("measured_by", "self");
    if (error) throw error;
  },
});

function onlyDeclaredFields(input: DeclaredMeasurementInput): DeclaredMeasurementInput {
  const allowed = new Set<string>(DECLARED_FIELDS);
  return Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
}
