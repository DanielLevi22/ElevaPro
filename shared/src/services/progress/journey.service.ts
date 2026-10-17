import type { SupabaseClient } from "@supabase/supabase-js";
import type { PhysicalAssessment } from "../../types/physicalAssessment.types";
import { bodyComposition, latestSource, seriesOf } from "../../utils/bodyMeasurements";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays } from "../../utils/dateOnly";
import { type Journey, type JourneyBlock, summarizeJourney } from "../../utils/journey";
import { loadRecords } from "../../utils/periodReport";
import type { WeekAdjustment } from "../../utils/weeklyReport";
import { practitionerEnergy } from "../nutrition/practitionerEnergy";
import type { WeightPoint } from "../nutrition/weeklyCheckIn.service";
import { createRestService } from "../workouts/rest.service";
import { createMeasurementService } from "./measurement.service";
import { createProgressService } from "./progress.service";
import { planAdjustmentsBetween } from "./weeklyReport.service";

/** As janelas da tendência de peso (A10). */
export type TrendPeriod = "4w" | "3m" | "all";

const PERIOD_DAYS: Record<Exclude<TrendPeriod, "all">, number> = { "4w": 28, "3m": 91 };
/** Quilocalorias em um quilo de tecido corporal (Wishnofsky), a mesma conta da O8. */
const KCAL_PER_KG = 7700;

export interface WeightTrend {
  weights: WeightPoint[];
  /** O ritmo da meta, em kg por semana; nulo sem dieta. */
  expectedWeeklyKg: number | null;
  /** Os ajustes aprovados na janela. */
  adjustments: WeekAdjustment[];
}

/**
 * A tendência de peso (A10) e a jornada (D1) do aluno, sob a sessão dele: a
 * RLS das tabelas de saúde decide o que entra.
 *
 * @example const jornada = await createJourneyService(supabase).fetchJourney(user.id, hoje);
 */
export const createJourneyService = (supabase: SupabaseClient) => {
  const progress = createProgressService(supabase);
  const measurements = createMeasurementService(supabase);
  const rests = createRestService(supabase);

  return {
    /**
     * As pesagens da janela, na origem da mais recente, o ritmo da meta e os
     * ajustes aprovados.
     *
     * @example const tendencia = await journeys.fetchWeightTrend(user.id, "3m", "2026-10-14");
     */
    fetchWeightTrend: async (
      studentId: string,
      period: TrendPeriod,
      today: string,
    ): Promise<WeightTrend> => {
      const from = period === "all" ? "2000-01-01" : addDays(today, -PERIOD_DAYS[period]);
      const [measured, energy, adjustments] = await Promise.all([
        measurements.listMeasurements(studentId),
        practitionerEnergy(supabase, studentId),
        planAdjustmentsBetween(supabase, studentId, from, addDays(today, 1)),
      ]);
      const weights = weightSeries(measured).filter(
        (point) => point.assessedAt.slice(0, 10) >= from,
      );
      return {
        weights,
        expectedWeeklyKg: energy
          ? Math.round((((energy.targetCalories - energy.tdee) * 7) / KCAL_PER_KG) * 100) / 100
          : null,
        adjustments: adjustments.filter((item) => item.kind === "calories"),
      };
    },

    /**
     * Tudo o que aconteceu desde que o plano nasceu.
     *
     * @example const jornada = await journeys.fetchJourney(user.id, "2026-10-14");
     */
    fetchJourney: async (studentId: string, today: string): Promise<Journey> => {
      const { data, error } = await supabase
        .from("training_periodizations")
        .select("name, start_date, end_date, status, end_reason")
        .eq("student_id", studentId)
        .order("start_date", { ascending: true });
      if (error) throw error;
      const blocks = (data ?? []) as JourneyBlock[];
      const since = blocks[0]?.start_date ?? today;
      const [history, outline, sets, measured, adjustments, paused] = await Promise.all([
        progress.listActivityHistory(studentId),
        progress.getMealPlanOutline(studentId),
        progress.listCompletedSets(studentId, addDays(since, -182)),
        measurements.listMeasurements(studentId),
        planAdjustmentsBetween(supabase, studentId, since, addDays(today, 1)),
        rests.recent(studentId),
      ]);
      return summarizeJourney({
        today,
        blocks,
        records: loadRecords(sets, since, today),
        adjustments,
        rests: paused,
        weights: weightSeries(measured)
          .filter((point) => point.assessedAt.slice(0, 10) >= since)
          .map((point) => point.weightKg),
        days: dailyActivities({ from: since, to: today, ...history, ...outline }),
      });
    },
  };
};

export type JourneyService = ReturnType<typeof createJourneyService>;

/** As pesagens da origem mais recente: a fita e a balança de casa não se misturam. */
function weightSeries(measured: readonly PhysicalAssessment[]): WeightPoint[] {
  const source = latestSource(measured.filter((m) => bodyComposition(m).weight !== null));
  if (!source) return [];
  return seriesOf(measured, source).flatMap((m) => {
    const weightKg = bodyComposition(m).weight;
    return weightKg === null ? [] : [{ assessedAt: m.assessed_at, weightKg }];
  });
}
