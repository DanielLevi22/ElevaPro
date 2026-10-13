import type { SupabaseClient } from "@supabase/supabase-js";
import { practitionerDietTargetFromAnswers } from "../../utils/practitionerDietTarget";
import {
  type CheckInLogging,
  type Recalibration,
  recalibrateWeeklyTarget,
} from "../../utils/weeklyRecalibration";

export type CheckInStatus = "pending" | "approved" | "kept";

export interface WeeklyCheckIn {
  id: string;
  week_start: string;
  logging: CheckInLogging;
  assessment_id: string | null;
  status: CheckInStatus;
}

/** Uma pesagem declarada, para a tendência da tela de ajuste. */
export interface WeightPoint {
  assessedAt: string;
  weightKg: number;
}

/**
 * O que a semana rende para a tela A5: o ajuste proposto ao Praticante, o aviso
 * de que o especialista revisa (Aluno), ou nada a ajustar quando não há dieta
 * própria com meta.
 */
export type CheckInProposal =
  | { kind: "specialist" }
  | { kind: "no_diet" }
  | {
      kind: "proposal";
      recalibration: Recalibration;
      targetCalories: number;
      weights: WeightPoint[];
    };

/** A semana na tela inicial: nada a fazer, check-in devido, ou o que já foi feito. */
export type CheckInSummary =
  | { state: "none" }
  | { state: "due" }
  | { state: "pending" | "kept"; checkIn: WeeklyCheckIn }
  | { state: "approved"; checkIn: WeeklyCheckIn; targetCalories: number | null };

const CHECK_IN_COLUMNS = "id, week_start, logging, assessment_id, status";
/** A tendência da tela mostra até oito semanas. */
const WEIGHT_HISTORY = 8;
/** Só o que a meta usa: a anamnese tem dado de saúde que o check-in não precisa. */
const TARGET_FIELDS =
  "age:responses->age, height:responses->height, weight:responses->weight, gender:responses->gender, main_goal:responses->main_goal, training_days:responses->training_days, diet_screening:responses->diet_screening";

/**
 * O check-in da semana (#376): a pessoa diz como foi o registro e o peso, e a
 * meta da dieta é recalibrada por regra, sempre com aprovação. O banco grava
 * tudo pelas funções da 0088; este serviço só conversa com elas e monta a
 * proposta com `recalibrateWeeklyTarget`.
 *
 * @example
 * const checkIn = createWeeklyCheckInService(supabase);
 * const semana = await checkIn.submit({ logging: "all", weightKg: 77.6 });
 * const proposta = await checkIn.proposal(user.id, semana);
 */
export const createWeeklyCheckInService = (supabase: SupabaseClient) => ({
  /**
   * O estado da semana para a tela inicial (A6). O check-in é devido quando há
   * dieta ativa que começou antes desta semana: na primeira, não há o que
   * comparar. A semana é a do servidor, no fuso do Brasil.
   *
   * @example const semana = await checkIn.summary(user.id);
   */
  summary: async (studentId: string): Promise<CheckInSummary> => {
    const weekStart = currentWeekStart();
    const checkIn = await latestCheckIn(supabase, studentId);
    if (checkIn?.week_start === weekStart) {
      if (checkIn.status !== "approved") return { state: checkIn.status, checkIn };
      return {
        state: "approved",
        checkIn,
        targetCalories: await ownTargetCalories(supabase, studentId),
      };
    }
    return (await hasDietBefore(supabase, studentId, weekStart))
      ? { state: "due" }
      : { state: "none" };
  },

  /**
   * Grava o check-in. Sem peso para o Aluno: com especialista, quem mede é ele
   * (ADR-0030), e o banco recusa.
   *
   * @example await checkIn.submit({ logging: "partial", weightKg: null });
   */
  submit: async (input: { logging: CheckInLogging; weightKg: number | null }) => {
    const { data, error } = await supabase.rpc("submit_weekly_check_in", {
      p_logging: input.logging,
      p_weight_kg: input.weightKg,
    });
    if (error) throw error;
    return data as WeeklyCheckIn;
  },

  /** @example const proposta = await checkIn.proposal(user.id, semana); */
  proposal: async (studentId: string, checkIn: WeeklyCheckIn): Promise<CheckInProposal> => {
    if (await hasActiveSpecialist(supabase, studentId)) return { kind: "specialist" };
    const [targetCalories, answers, weights] = await Promise.all([
      ownTargetCalories(supabase, studentId),
      targetAnswers(supabase, studentId),
      declaredWeights(supabase, studentId),
    ]);
    if (targetCalories === null) return { kind: "no_diet" };

    const thisWeek = weightOf(weights, checkIn);
    const target = practitionerDietTargetFromAnswers({
      ...answers,
      weight: thisWeek ?? answers.weight,
    });
    if (!target || target.kind === "no_diet") return { kind: "no_diet" };

    const recalibration = recalibrateWeeklyTarget({
      logging: checkIn.logging,
      weightKg: thisWeek,
      previousWeightKg: weightBefore(weights, checkIn.week_start),
      targetCalories,
      tdee: target.tdee,
      tmb: target.tmb,
    });
    return { kind: "proposal", recalibration, targetCalories, weights };
  },

  /**
   * Aprova o ajuste: nova versão da dieta, ativada, e o ajuste no histórico.
   *
   * @example await checkIn.approve(semana.id, proposta.recalibration);
   */
  approve: async (checkInId: string, recalibration: Recalibration): Promise<void> => {
    if (recalibration.deltaCalories === 0) {
      throw new Error(
        `ajuste sem mudança (${recalibration.verdict}): use keep para manter a meta da semana`,
      );
    }
    const { error } = await supabase.rpc("apply_weekly_calorie_adjustment", {
      p_check_in_id: checkInId,
      p_new_calories: recalibration.proposedCalories,
      p_reason: recalibration.verdict,
    });
    if (error) throw error;
  },

  /** "Manter mais uma semana". @example await checkIn.keep(semana.id); */
  keep: async (checkInId: string): Promise<void> => {
    const { error } = await supabase.rpc("keep_weekly_target", { p_check_in_id: checkInId });
    if (error) throw error;
  },
});

export type WeeklyCheckInService = ReturnType<typeof createWeeklyCheckInService>;

/**
 * A segunda-feira desta semana no fuso do Brasil, como `private.current_check_in_week`.
 *
 * @example currentWeekStart(new Date("2026-10-11T23:00:00-03:00")) // "2026-10-05"
 */
export function currentWeekStart(now: Date = new Date()): string {
  // Conta, e não `new Date(now.toLocaleString(...))`: o Hermes não lê data em
  // texto fora do ISO, a semana virava "NaN-NaN-NaN" e o cartão sumia no
  // aparelho com os testes passando no Node. O Brasil está em UTC−3 fixo
  // desde 2019, sem horário de verão.
  const brazil = new Date(now.getTime() - BRAZIL_OFFSET_MS);
  const sinceMonday = (brazil.getUTCDay() + 6) % 7;
  brazil.setUTCDate(brazil.getUTCDate() - sinceMonday);
  return brazil.toISOString().slice(0, 10);
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

async function latestCheckIn(supabase: SupabaseClient, studentId: string) {
  const { data, error } = await supabase
    .from("weekly_check_ins")
    .select(CHECK_IN_COLUMNS)
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as WeeklyCheckIn | null;
}

async function hasDietBefore(supabase: SupabaseClient, studentId: string, weekStart: string) {
  const { count, error } = await supabase
    .from("diet_plans")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "active")
    .lt("start_date", weekStart);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function hasActiveSpecialist(supabase: SupabaseClient, studentId: string) {
  const { count, error } = await supabase
    .from("student_specialists")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "active");
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function ownTargetCalories(supabase: SupabaseClient, studentId: string) {
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

async function targetAnswers(
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

async function declaredWeights(
  supabase: SupabaseClient,
  studentId: string,
): Promise<(WeightPoint & { id: string })[]> {
  const { data, error } = await supabase
    .from("physical_assessments")
    .select("id, assessed_at, weight_kg")
    .eq("student_id", studentId)
    .eq("measured_by", "self")
    .order("assessed_at", { ascending: false })
    .limit(WEIGHT_HISTORY);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    assessedAt: row.assessed_at,
    weightKg: Number(row.weight_kg),
  }));
}

function weightOf(weights: (WeightPoint & { id: string })[], checkIn: WeeklyCheckIn) {
  return weights.find((point) => point.id === checkIn.assessment_id)?.weightKg ?? null;
}

/** O peso declarado mais recente antes da semana do check-in. */
function weightBefore(weights: WeightPoint[], weekStart: string) {
  return weights.find((point) => point.assessedAt.slice(0, 10) < weekStart)?.weightKg ?? null;
}
