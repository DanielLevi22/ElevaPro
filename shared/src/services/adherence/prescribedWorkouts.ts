import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quantos treinos por semana o plano prescreve: os da fase ativa da
 * periodização ativa que têm dia da semana. É o "de 4" de "4 de 4 treinos",
 * na aderência do especialista e no relatório da semana (#376).
 *
 * `null` sem periodização ativa, sem fase ativa ou sem treino com dia — nunca
 * 0, que faria qualquer semana parecer completa.
 *
 * @example const porSemana = await countPrescribedWorkouts(supabase, aluno.id); // 4
 */
export async function countPrescribedWorkouts(
  supabase: SupabaseClient,
  studentId: string,
): Promise<number | null> {
  const { data: periodization, error: perError } = await supabase
    .from("training_periodizations")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (perError) throw perError;
  if (!periodization) return null;

  const { data: plan, error: planError } = await supabase
    .from("training_plans")
    .select("id")
    .eq("periodization_id", (periodization as { id: string }).id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return null;

  const { count, error: workoutsError } = await supabase
    .from("workouts")
    .select("id", { count: "exact", head: true })
    .eq("training_plan_id", (plan as { id: string }).id)
    .not("day_of_week", "is", null);
  if (workoutsError) throw workoutsError;
  return count || null;
}
