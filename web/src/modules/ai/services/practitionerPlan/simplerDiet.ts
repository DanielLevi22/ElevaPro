import {
  createNutritionService,
  createWeeklyCheckInService,
  type OnboardingPlanTarget,
  type SimplerDietPending,
  type WeeklyCheckIn,
} from "@elevapro/shared";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { FASTER } from "./adjustPlan";
import { type GenerationOutcome, generatePractitionerPlan } from "./generatePlan";
import { activeOwnDietId, markEndedDiet, type SavePlanContext, saveDiet } from "./savePlan";

const CHECK_IN_COLUMNS = "id, week_start, logging, assessment_id, status, weight_origin";

interface OwnDiet {
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
}

export type SimplerDietOutcome =
  | { ok: true; pending: SimplerDietPending }
  | { ok: false; reason: "no_check_in" | "not_simplifiable" | "no_diet" }
  | Extract<GenerationOutcome, { ok: false }>;

/**
 * Monta o plano mais simples do check-in (#376, A5c): a mesma meta, uma
 * refeição a menos e receitas rápidas. O servidor confere de novo que a
 * semana pede isso: o app só oferece, e quem decide é a mesma conta do
 * check-in. Nada é gravado aqui (ADR-0020).
 *
 * @example const outcome = await prepareSimplerDiet(aluno.id, checkIn.id);
 */
export async function prepareSimplerDiet(
  studentId: string,
  checkInId: string,
): Promise<SimplerDietOutcome> {
  const checkIn = await pendingCheckIn(studentId, checkInId);
  if (!checkIn) return { ok: false, reason: "no_check_in" };
  const proposal = await createWeeklyCheckInService(supabaseAdmin).proposal(studentId, checkIn);
  if (proposal.kind !== "proposal" || !proposal.simplerPlan) {
    return { ok: false, reason: "not_simplifiable" };
  }
  const diet = await ownDiet(studentId);
  if (!diet) return { ok: false, reason: "no_diet" };
  const { mealsPerDay, nextMealsPerDay } = proposal.simplerPlan;
  const outcome = await generatePractitionerPlan(studentId, {
    // Só as refeições: o treino segue como está.
    answersOverride: { meals_per_day: nextMealsPerDay, plan_scope: "diet" },
    targetOverride: targetOf(diet),
    dietInstruction: FASTER,
    estimate: "faster",
  });
  if (!outcome.ok) return outcome;
  return {
    ok: true,
    pending: {
      checkInId,
      mealsBefore: mealsPerDay,
      mealsAfter: nextMealsPerDay,
      plan: outcome.pending,
    },
  };
}

/**
 * Grava o plano mais simples aprovado: a dieta nova, ativada, a anterior
 * encerrada como trocada, e o ajuste no histórico, que fecha o check-in. Se o
 * registro falhar depois de ativar, a anterior volta: ninguém fica sem dieta.
 *
 * @example const { dietPlanId } = await saveSimplerDiet(ctx, pendente);
 */
export async function saveSimplerDiet(
  ctx: SavePlanContext,
  pending: SimplerDietPending,
): Promise<{ dietPlanId: string }> {
  const previousDietId = await activeOwnDietId(ctx.studentId);
  const dietPlanId = await saveDiet(ctx, pending.plan);
  // Se o registro falhar, o desfazer da aprovação apaga a dieta nova.
  ctx.registrar(dietPlanId);
  const { error } = await ctx.titular.rpc("record_plan_simplification", {
    p_check_in_id: pending.checkInId,
    p_diet_plan_id: dietPlanId,
    p_meals_before: pending.mealsBefore,
    p_meals_after: pending.mealsAfter,
  });
  if (error) {
    if (previousDietId) await createNutritionService(ctx.titular).activateDietPlan(previousDietId);
    throw new Error(`plano mais simples não foi registrado: ${error.message}`);
  }
  await markEndedDiet(previousDietId, "replaced");
  return { dietPlanId };
}

async function pendingCheckIn(studentId: string, checkInId: string): Promise<WeeklyCheckIn | null> {
  const { data, error } = await supabaseAdmin
    .from("weekly_check_ins")
    .select(CHECK_IN_COLUMNS)
    .eq("id", checkInId)
    .eq("student_id", studentId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw new Error(`check-in ${checkInId} não foi lido: ${error.message}`);
  return data as WeeklyCheckIn | null;
}

async function ownDiet(studentId: string): Promise<OwnDiet | null> {
  const { data, error } = await supabaseAdmin
    .from("diet_plans")
    .select("target_calories, target_protein, target_carbs, target_fat")
    .eq("student_id", studentId)
    .eq("status", "active")
    .is("specialist_id", null)
    .maybeSingle();
  if (error) throw new Error(`dieta de ${studentId} não foi lida: ${error.message}`);
  return data as OwnDiet | null;
}

/** A meta da dieta ativa, a que os check-ins já ajustaram: é ela que fica. */
function targetOf(diet: OwnDiet): OnboardingPlanTarget {
  return {
    calories: Number(diet.target_calories),
    protein: Number(diet.target_protein),
    carbs: Number(diet.target_carbs),
    fat: Number(diet.target_fat),
    guards: [],
  };
}
