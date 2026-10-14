import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays } from "../../utils/dateOnly";
import {
  brazilDayStart,
  reportWeekStart,
  summarizeWeek,
  type WeekAdjustment,
  type WeeklyReport,
} from "../../utils/weeklyReport";
import { countPrescribedWorkouts } from "../adherence/prescribedWorkouts";
import { fetchSwapActivity } from "../briefing/exerciseSwapActivity";
import { createMeasurementService } from "./measurement.service";
import { createProgressService } from "./progress.service";

/** O recorde é contra o histórico: seis meses de séries antes da semana bastam. */
const RECORD_LOOKBACK_DAYS = 182;
/** A sequência olha até um ano para trás. */
const STREAK_LOOKBACK_DAYS = 364;
const SWAP_LIMIT = 50;

interface AdjustmentRow {
  before_value: number;
  after_value: number;
  reason: "weight_above_pace" | "weight_below_pace" | "undo";
  approved_at: string;
}

/**
 * O relatório da semana do aluno (#376, R1), de uma chamada. Lê sob a sessão
 * de quem chama: a RLS das tabelas de saúde decide, e o consentimento revogado
 * esvazia o que é Art. 11 sem quebrar a tela.
 *
 * @example
 * const report = await createWeeklyReportService(supabase).fetchWeeklyReport(user.id, "2026-10-11");
 */
export const createWeeklyReportService = (supabase: SupabaseClient) => {
  const progress = createProgressService(supabase);
  const measurements = createMeasurementService(supabase);

  return {
    fetchWeeklyReport: async (studentId: string, today: string): Promise<WeeklyReport> => {
      const weekStart = reportWeekStart(today);
      const weekEnd = addDays(weekStart, 6);
      const [history, outline, sets, measured, planned, adjustments] = await Promise.all([
        progress.listActivityHistory(studentId),
        progress.getMealPlanOutline(studentId),
        progress.listCompletedSets(studentId, addDays(weekStart, -RECORD_LOOKBACK_DAYS)),
        measurements.listMeasurements(studentId),
        countPrescribedWorkouts(supabase, studentId),
        planAdjustmentsBetween(supabase, studentId, weekStart, addDays(weekEnd, 1)),
      ]);
      const days = dailyActivities({
        from: addDays(weekStart, -STREAK_LOOKBACK_DAYS),
        to: weekEnd,
        ...history,
        ...outline,
      });
      return summarizeWeek({
        weekStart,
        days,
        sets,
        plannedWorkouts: planned,
        measurements: measured,
        adjustments,
      });
    },
  };
};

export type WeeklyReportService = ReturnType<typeof createWeeklyReportService>;

/**
 * Os ajustes de meta aprovados e as trocas que mudaram o plano entre duas
 * datas (a segunda fora): a semana do relatório ou o bloco inteiro.
 *
 * @example const ajustes = await planAdjustmentsBetween(supabase, aluno.id, "2026-10-05", "2026-10-12");
 */
export async function planAdjustmentsBetween(
  supabase: SupabaseClient,
  studentId: string,
  fromDate: string,
  untilDate: string,
): Promise<WeekAdjustment[]> {
  const from = brazilDayStart(fromDate);
  const until = brazilDayStart(untilDate);
  const [calories, swaps] = await Promise.all([
    supabase
      .from("plan_adjustments")
      .select("before_value, after_value, reason, approved_at")
      .eq("student_id", studentId)
      .gte("approved_at", from)
      .lt("approved_at", until),
    fetchSwapActivity(supabase, [studentId], SWAP_LIMIT, from),
  ]);
  if (calories.error) throw calories.error;
  return [
    ...((calories.data ?? []) as AdjustmentRow[]).map((row) => ({
      kind: "calories" as const,
      before: Number(row.before_value),
      after: Number(row.after_value),
      reason: row.reason,
      at: row.approved_at,
    })),
    ...swaps
      .filter((swap) => swap.inPlan && swap.at < until)
      .map((swap) => ({ kind: "swap" as const, summary: swap.summary, at: swap.at })),
  ];
}
