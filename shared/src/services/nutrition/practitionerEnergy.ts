import type { SupabaseClient } from "@supabase/supabase-js";
import { practitionerDietTargetFromAnswers } from "../../utils/practitionerDietTarget";

/*
 * A energia do Praticante: o gasto pelas respostas e a meta da dieta ativa. O
 * check-in recalibra a meta com ela, e o relatório do bloco compara o
 * prometido com o real (#376).
 */

/** Só o que a meta usa: a anamnese tem dado de saúde que o check-in não precisa. */
const TARGET_FIELDS =
  "age:responses->age, height:responses->height, weight:responses->weight, gender:responses->gender, main_goal:responses->main_goal, training_days:responses->training_days, diet_screening:responses->diet_screening";

/**
 * A meta de calorias da dieta ativa do próprio Praticante; nula sem dieta.
 *
 * @example const meta = await ownTargetCalories(supabase, aluno.id); // 2000
 */
export async function ownTargetCalories(supabase: SupabaseClient, studentId: string) {
  const { data, error } = await supabase
    .from("diet_plans")
    .select("target_calories")
    .eq("student_id", studentId)
    .is("specialist_id", null)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data?.target_calories ?? null;
}

/**
 * Só as respostas que a meta usa: idade, altura, peso, sexo, objetivo, dias e a
 * triagem da dieta. O resto da anamnese não sai.
 *
 * @example const respostas = await targetAnswers(supabase, aluno.id);
 */
export async function targetAnswers(
  supabase: SupabaseClient,
  studentId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("student_anamnesis")
    .select(TARGET_FIELDS)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? {}) as Record<string, unknown>;
}

/**
 * O gasto e a meta da dieta ativa, para a promessa do relatório do bloco.
 * Nulo sem dieta ou sem as respostas que a conta pede.
 *
 * @example const energia = await practitionerEnergy(supabase, aluno.id); // { tdee: 2539, targetCalories: 1989 }
 */
export async function practitionerEnergy(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ tdee: number; targetCalories: number } | null> {
  const [answers, calories] = await Promise.all([
    targetAnswers(supabase, studentId),
    ownTargetCalories(supabase, studentId),
  ]);
  const target = practitionerDietTargetFromAnswers(answers);
  if (target?.kind !== "target" || !calories) return null;
  return { tdee: target.tdee, targetCalories: Number(calories) };
}
