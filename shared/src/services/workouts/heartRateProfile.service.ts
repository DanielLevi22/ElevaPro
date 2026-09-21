import type { SupabaseClient } from "@supabase/supabase-js";
import { declaresContinuousMedication, lerRespostaNumerica } from "../../utils/anamnese";
import { estimateMaxHeartRate } from "../../utils/heartRateZones";

/** O que as zonas de FC precisam saber do Student, e nada além. */
export interface HeartRateProfile {
  /** 220 − idade atual, ou `null` sem idade declarada. */
  maxHeartRate: number | null;
  /** A anamnese declara medicação contínua: as zonas ganham o aviso. */
  declaresMedication: boolean;
}

interface AnamnesisExcerpt {
  age: unknown;
  medications: unknown;
  completed_at: string | null;
}

const NO_PROFILE: HeartRateProfile = { maxHeartRate: null, declaresMedication: false };

function maxHeartRateFrom(excerpt: AnamnesisExcerpt, today: Date): number | null {
  const age = lerRespostaNumerica(excerpt.age, "age");
  if (!age.ok) return null;
  // Sem data de conclusão, conta como declarada hoje: somar anos a partir de uma
  // data inventada envelheceria o aluno sem motivo.
  const declaredAt = excerpt.completed_at ? new Date(excerpt.completed_at) : today;
  return estimateMaxHeartRate(age.valor, declaredAt, today);
}

/**
 * O perfil de FC do Student, lido da anamnese com o mínimo: a idade e a resposta
 * sobre medicação contínua (`LGPD_COMPLIANCE.md` §2.3).
 *
 * @example
 * const { maxHeartRate, declaresMedication } = await service.fetchProfile(student.id, new Date());
 */
export const createHeartRateProfileService = (supabase: SupabaseClient) => ({
  fetchProfile: async (studentId: string, today: Date): Promise<HeartRateProfile> => {
    const { data, error } = await supabase
      .from("student_anamnesis")
      .select("age:responses->age, medications:responses->medications, completed_at")
      .eq("student_id", studentId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NO_PROFILE;

    const excerpt = data as AnamnesisExcerpt;
    return {
      maxHeartRate: maxHeartRateFrom(excerpt, today),
      declaresMedication: declaresContinuousMedication(excerpt.medications),
    };
  },
});
