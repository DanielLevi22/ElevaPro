import type { SupabaseClient } from "@supabase/supabase-js";
import { nomeCurto } from "../../utils/nome";
import { practitionerDietTargetFromAnswers } from "../../utils/practitionerDietTarget";
import {
  type CheckInLogging,
  type Recalibration,
  recalibrateWeeklyTarget,
} from "../../utils/weeklyRecalibration";
import { createMeasurementService } from "../progress/measurement.service";
import { ownTargetCalories, targetAnswers } from "./practitionerEnergy";

export type CheckInStatus = "pending" | "approved" | "kept";

export interface WeeklyCheckIn {
  id: string;
  week_start: string;
  logging: CheckInLogging;
  assessment_id: string | null;
  status: CheckInStatus;
}

/** O que a pessoa responde no check-in (A4). O Aluno manda sem peso (ADR-0030). */
export interface CheckInSubmission {
  logging: CheckInLogging;
  weightKg: number | null;
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
    };

/** A semana na tela inicial: nada a fazer, check-in devido, ou o que já foi feito. */
export type CheckInSummary =
  | { state: "none" }
  | { state: "due" }
  | { state: "pending" | "kept"; checkIn: WeeklyCheckIn }
  | { state: "approved"; checkIn: WeeklyCheckIn; adjustment: RecordedAdjustment | null };

const CHECK_IN_COLUMNS = "id, week_start, logging, assessment_id, status";
/** A tendência da tela mostra até oito semanas. */
const WEIGHT_HISTORY = 8;
const DAY_MS = 86_400_000;

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

/**
 * A segunda-feira desta semana no fuso do Brasil, como `private.current_check_in_week`.
 *
 * @example currentWeekStart(new Date("2026-10-11T23:00:00-03:00")) // "2026-10-05"
 */
export function currentWeekStart(now: Date = new Date()): string {
  const brazil = toBrazilTime(now);
  const sinceMonday = (brazil.getUTCDay() + 6) % 7;
  brazil.setUTCDate(brazil.getUTCDate() - sinceMonday);
  return brazil.toISOString().slice(0, 10);
}

/**
 * Se o instante cai no mesmo dia, no Brasil, que agora: o "Desfazer" só vale no
 * dia do ajuste, a mesma regra de `undo_weekly_calorie_adjustment`.
 *
 * @example isTodayInBrazil(ajuste.approvedAt) // true no dia da aprovação
 */
export function isTodayInBrazil(instant: string, now: Date = new Date()): boolean {
  const day = (date: Date) => toBrazilTime(date).toISOString().slice(0, 10);
  return day(new Date(instant)) === day(now);
}

/**
 * Conta, e não `new Date(now.toLocaleString(...))`: o Hermes não lê data em
 * texto fora do ISO, a semana virava "NaN-NaN-NaN" e o cartão sumia no
 * aparelho com os testes passando no Node. O Brasil está em UTC−3 fixo desde
 * 2019, sem horário de verão.
 */
function toBrazilTime(instant: Date): Date {
  return new Date(instant.getTime() - BRAZIL_OFFSET_MS);
}

const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;

async function practitionerProposal(
  supabase: SupabaseClient,
  studentId: string,
  checkIn: WeeklyCheckIn,
): Promise<CheckInProposal> {
  const [targetCalories, answers, weights] = await Promise.all([
    ownTargetCalories(supabase, studentId),
    targetAnswers(supabase, studentId),
    declaredWeights(supabase, studentId),
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
  });
  return { kind: "proposal", recalibration, targetCalories, weights };
}

/** As semanas entre duas pesagens, arredondadas: o check-in é semanal. */
function weeksBetween(previous: WeightPoint, current: WeightPoint): number {
  const days = (Date.parse(current.assessedAt) - Date.parse(previous.assessedAt)) / DAY_MS;
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

async function adjustmentOf(
  supabase: SupabaseClient,
  checkInId: string,
): Promise<RecordedAdjustment | null> {
  const { data, error } = await supabase
    .from("plan_adjustments")
    .select("before_value, after_value, approved_at")
    .eq("check_in_id", checkInId)
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
async function linkedSpecialistName(supabase: SupabaseClient, studentId: string) {
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
