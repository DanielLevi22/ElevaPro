import type { SupabaseClient } from "@supabase/supabase-js";
import type { OnboardingPlanPending } from "../../types/onboardingPlan.types";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays, brazilToday, currentWeekStart, daysBetween } from "../../utils/dateOnly";
import { nomeCurto } from "../../utils/nome";
import { practitionerDietTargetFromAnswers } from "../../utils/practitionerDietTarget";
import { restingNow } from "../../utils/restMode";
import { STALL_WEEKS, stalledWeek } from "../../utils/stagnation";
import {
  type CheckInLogging,
  expectedWeeklyKg,
  type Recalibration,
  recalibrateWeeklyTarget,
} from "../../utils/weeklyRecalibration";
import { dietDays } from "../../utils/weeklyReport";
import { createMeasurementService } from "../progress/measurement.service";
import { createProgressService } from "../progress/progress.service";
import { createRestService } from "../workouts/rest.service";
import { ownTargetCalories, targetAnswers } from "./practitionerEnergy";

export type CheckInStatus = "pending" | "approved" | "kept";

export interface WeeklyCheckIn {
  id: string;
  week_start: string;
  logging: CheckInLogging;
  assessment_id: string | null;
  status: CheckInStatus;
  /** De onde veio o peso; nulo sem peso (0093, F9). */
  weight_origin: WeightOrigin | null;
}

/** Digitado, ou a média da semana do app Saúde / Health Connect (F9). */
export type WeightOrigin = "manual" | "health_app";

/** O que a pessoa responde no check-in (A4). O Aluno manda sem peso (ADR-0030). */
export interface CheckInSubmission {
  logging: CheckInLogging;
  weightKg: number | null;
  /** Sem ela, "manual": é o que a pessoa digitou. */
  weightOrigin?: WeightOrigin;
}

/** Uma pesagem, para a tendência da tela de ajuste e a medida do especialista. */
export interface WeightPoint {
  assessedAt: string;
  weightKg: number;
}

/** O ajuste gravado: o que a tela mostra depois de aprovar, em vez de recalcular. */
export interface RecordedAdjustment {
  beforeCalories: number;
  afterCalories: number;
  approvedAt: string;
}

/**
 * O que a semana rende para a tela A5: o ajuste proposto ao Praticante, o que
 * já foi decidido, o aviso de que o especialista revisa (Aluno), ou nada a
 * ajustar quando não há dieta própria com meta.
 */
export type CheckInProposal =
  | { kind: "specialist"; specialistName: string | null; lastMeasurement: WeightPoint | null }
  | { kind: "no_diet" }
  | { kind: "decided"; status: "approved" | "kept"; adjustment: RecordedAdjustment | null }
  | {
      kind: "proposal";
      recalibration: Recalibration;
      targetCalories: number;
      weights: WeightPoint[];
      /** Com aderência baixa, o plano mais simples (A5c); nulo fora disso. */
      simplerPlan: SimplerPlan | null;
    };

/**
 * O plano mais simples (A5c): a mesma meta, uma refeição a menos e receitas
 * mais rápidas. Só para quem tem mais de 3 refeições por dia.
 */
export interface SimplerPlan {
  /** Os dias da semana passada com o plano do dia cumprido. */
  adherenceDays: number;
  mealsPerDay: number;
  nextMealsPerDay: number;
}

/**
 * O cardápio mais simples que espera "Aprovar" (ADR-0020): montado pelo BFF a
 * partir do check-in, e gravado só com a aprovação.
 */
export interface SimplerDietPending {
  checkInId: string;
  mealsBefore: number;
  mealsAfter: number;
  plan: OnboardingPlanPending;
}

/** Menos de 3 refeições por dia o plano não fica: é o mínimo do onboarding. */
const MIN_MEALS_PER_DAY = 3;

/** A semana na tela inicial: nada a fazer, check-in devido, ou o que já foi feito. */
export type CheckInSummary =
  | { state: "none" }
  | { state: "due" }
  | { state: "pending" | "kept"; checkIn: WeeklyCheckIn }
  | { state: "approved"; checkIn: WeeklyCheckIn; adjustment: RecordedAdjustment | null };

const CHECK_IN_COLUMNS = "id, week_start, logging, assessment_id, status, weight_origin";
/** A tendência da tela mostra até oito semanas. */
const WEIGHT_HISTORY = 8;

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
export const createWeeklyCheckInService = (supabase: SupabaseClient) => {
  const measurements = createMeasurementService(supabase);

  return {
    /**
     * O estado da semana para a tela inicial (A6). O check-in é devido quando há
     * dieta ativa que começou antes desta semana: na primeira, não há o que
     * comparar. A semana é a do servidor, no fuso do Brasil.
     *
     * @example const semana = await checkIn.summary(user.id);
     */
    summary: async (studentId: string): Promise<CheckInSummary> => {
      // No Modo Descanso o check-in espera (#376, A8): não há semana para contar.
      const rests = await createRestService(supabase).recent(studentId);
      if (restingNow(rests, brazilToday())) return { state: "none" };
      const weekStart = currentWeekStart();
      const checkIn = await latestCheckIn(supabase, studentId);
      if (checkIn?.week_start === weekStart) {
        if (checkIn.status !== "approved") return { state: checkIn.status, checkIn };
        return { state: "approved", checkIn, adjustment: await adjustmentOf(supabase, checkIn.id) };
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
    submit: async (input: CheckInSubmission): Promise<WeeklyCheckIn> => {
      const { data, error } = await supabase.rpc("submit_weekly_check_in", {
        p_logging: input.logging,
        p_weight_kg: input.weightKg,
        p_weight_origin: input.weightOrigin ?? "manual",
      });
      if (error) throw error;
      return data as WeeklyCheckIn;
    },

    /** @example const proposta = await checkIn.proposal(user.id, semana); */
    proposal: async (studentId: string, checkIn: WeeklyCheckIn): Promise<CheckInProposal> => {
      // Decidido, a tela mostra o que foi gravado: recalcular sobre a meta nova
      // mostraria mais um passo em vez do ajuste aprovado.
      if (checkIn.status !== "pending") {
        return {
          kind: "decided",
          status: checkIn.status,
          adjustment: await adjustmentOf(supabase, checkIn.id),
        };
      }
      if (await measurements.hasActiveSpecialist(studentId)) {
        return specialistReview(supabase, studentId);
      }
      return practitionerProposal(supabase, studentId, checkIn);
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

    /**
     * A semana em que o peso parou há 3 semanas com a meta seguida, ou nula: o
     * gatilho da reavaliação antecipada (#376). Só do Praticante; o do Aluno
     * fica com o especialista.
     *
     * @example const semana = await checkIn.stalledWeek(user.id); // "2026-10-12"
     */
    stalledWeek: async (studentId: string): Promise<string | null> => {
      if (await measurements.hasActiveSpecialist(studentId)) return null;
      const [targetCalories, answers, weights, checkIns] = await Promise.all([
        ownTargetCalories(supabase, studentId),
        targetAnswers(supabase, studentId),
        declaredWeights(supabase, studentId),
        recentCheckIns(supabase, studentId),
      ]);
      if (targetCalories === null) return null;
      const target = practitionerDietTargetFromAnswers({
        ...answers,
        weight: weights[0]?.weightKg ?? answers.weight,
      });
      if (!target || target.kind === "no_diet") return null;
      return stalledWeek({
        checkIns,
        weights,
        expectedWeeklyKg: expectedWeeklyKg(targetCalories, target.tdee),
      });
    },

    /** "Manter mais uma semana". @example await checkIn.keep(semana.id); */
    keep: async (checkInId: string): Promise<void> => {
      const { error } = await supabase.rpc("keep_weekly_target", { p_check_in_id: checkInId });
      if (error) throw error;
    },

    /**
     * "Desfazer" no mesmo dia: a meta volta, e o histórico ganha o inverso.
     *
     * @example await checkIn.undo(semana.id);
     */
    undo: async (checkInId: string): Promise<void> => {
      const { error } = await supabase.rpc("undo_weekly_calorie_adjustment", {
        p_check_in_id: checkInId,
      });
      if (error) throw error;
    },
  };
};

export type WeeklyCheckInService = ReturnType<typeof createWeeklyCheckInService>;

async function practitionerProposal(
  supabase: SupabaseClient,
  studentId: string,
  checkIn: WeeklyCheckIn,
): Promise<CheckInProposal> {
  const [targetCalories, answers, weights, week] = await Promise.all([
    ownTargetCalories(supabase, studentId),
    targetAnswers(supabase, studentId),
    declaredWeights(supabase, studentId),
    lastWeekAdherence(supabase, studentId, checkIn.week_start),
  ]);
  if (targetCalories === null) return { kind: "no_diet" };

  const thisWeek = weights.find((point) => point.id === checkIn.assessment_id) ?? null;
  const previous = weights.find((point) => point.assessedAt.slice(0, 10) < checkIn.week_start);
  const target = practitionerDietTargetFromAnswers({
    ...answers,
    weight: thisWeek?.weightKg ?? answers.weight,
  });
  if (!target || target.kind === "no_diet") return { kind: "no_diet" };

  const recalibration = recalibrateWeeklyTarget({
    logging: checkIn.logging,
    weightKg: thisWeek?.weightKg ?? null,
    previousWeightKg: previous?.weightKg ?? null,
    weeksSincePrevious: thisWeek && previous ? weeksBetween(previous, thisWeek) : 1,
    targetCalories,
    tdee: target.tdee,
    tmb: target.tmb,
    adherenceDays: week.adherenceDays,
  });
  const simplerPlan =
    recalibration.verdict === "low_adherence" &&
    week.adherenceDays !== null &&
    week.mealsPerDay > MIN_MEALS_PER_DAY
      ? {
          adherenceDays: week.adherenceDays,
          mealsPerDay: week.mealsPerDay,
          nextMealsPerDay: week.mealsPerDay - 1,
        }
      : null;
  return { kind: "proposal", recalibration, targetCalories, weights, simplerPlan };
}

/**
 * A semana que o check-in olha, a de antes da atual: quantos dias o plano do
 * dia foi cumprido (nulo sem dieta planejada) e quantas refeições o plano tem.
 */
async function lastWeekAdherence(
  supabase: SupabaseClient,
  studentId: string,
  weekStart: string,
): Promise<{ adherenceDays: number | null; mealsPerDay: number }> {
  const progress = createProgressService(supabase);
  const [history, outline] = await Promise.all([
    progress.listActivityHistory(studentId),
    progress.getMealPlanOutline(studentId),
  ]);
  const week = dailyActivities({
    from: addDays(weekStart, -7),
    to: addDays(weekStart, -1),
    ...history,
    ...outline,
  });
  return {
    adherenceDays: dietDays(week)?.daysOnTarget ?? null,
    mealsPerDay: Math.max(0, ...week.map((day) => day.plannedMeals)),
  };
}

/** As semanas entre duas pesagens, arredondadas: o check-in é semanal. */
function weeksBetween(previous: WeightPoint, current: WeightPoint): number {
  const days = daysBetween(previous.assessedAt.slice(0, 10), current.assessedAt.slice(0, 10));
  return Math.max(1, Math.round(days / 7));
}

/** A5 do Aluno: quem revisa, e a última medida dele no lugar da tendência (ADR-0030). */
async function specialistReview(
  supabase: SupabaseClient,
  studentId: string,
): Promise<CheckInProposal> {
  const [specialistName, lastMeasurement] = await Promise.all([
    linkedSpecialistName(supabase, studentId),
    lastSpecialistMeasurement(supabase, studentId),
  ]);
  return { kind: "specialist", specialistName, lastMeasurement };
}

async function recentCheckIns(
  supabase: SupabaseClient,
  studentId: string,
): Promise<{ weekStart: string; logging: CheckInLogging }[]> {
  const { data, error } = await supabase
    .from("weekly_check_ins")
    .select("week_start, logging")
    .eq("student_id", studentId)
    .order("week_start", { ascending: false })
    .limit(STALL_WEEKS);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    weekStart: row.week_start,
    logging: row.logging as CheckInLogging,
  }));
}

async function latestCheckIn(
  supabase: SupabaseClient,
  studentId: string,
): Promise<WeeklyCheckIn | null> {
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

async function adjustmentOf(
  supabase: SupabaseClient,
  checkInId: string,
): Promise<RecordedAdjustment | null> {
  const { data, error } = await supabase
    .from("plan_adjustments")
    .select("before_value, after_value, approved_at")
    .eq("check_in_id", checkInId)
    // O "Desfazer" e o "Plano atualizado" são da meta: a simplificação tem tela própria.
    .eq("kind", "calories")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    beforeCalories: Number(data.before_value),
    afterCalories: Number(data.after_value),
    approvedAt: data.approved_at,
  };
}

async function hasDietBefore(
  supabase: SupabaseClient,
  studentId: string,
  weekStart: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("diet_plans")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "active")
    .lt("start_date", weekStart);
  if (error) throw error;
  return (count ?? 0) > 0;
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

/** O nome curto do especialista ativo: a política da 0016 deixa o aluno ler só esse perfil. */
async function linkedSpecialistName(
  supabase: SupabaseClient,
  studentId: string,
): Promise<string | null> {
  const { data: link, error } = await supabase
    .from("student_specialists")
    .select("specialist_id")
    .eq("student_id", studentId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!link) return null;
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", link.specialist_id)
    .maybeSingle();
  if (profileError) throw profileError;
  return profile?.full_name ? nomeCurto(profile.full_name) : null;
}

async function lastSpecialistMeasurement(
  supabase: SupabaseClient,
  studentId: string,
): Promise<WeightPoint | null> {
  const { data, error } = await supabase
    .from("physical_assessments")
    .select("assessed_at, weight_kg")
    .eq("student_id", studentId)
    .eq("measured_by", "specialist")
    .order("assessed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { assessedAt: data.assessed_at, weightKg: Number(data.weight_kg) } : null;
}
