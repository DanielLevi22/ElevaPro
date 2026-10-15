import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlockDates } from "../../utils/blockCycle";
import { type BlockReport, summarizeBlock } from "../../utils/blockReport";
import { dailyActivities } from "../../utils/dailyActivity";
import { addDays } from "../../utils/dateOnly";
import { pausedDays } from "../../utils/restMode";
import { countPrescribedWorkouts } from "../adherence/prescribedWorkouts";
import { practitionerEnergy } from "../nutrition/practitionerEnergy";
import { createRestService } from "../workouts/rest.service";
import { createMeasurementService } from "./measurement.service";
import { createProgressService } from "./progress.service";
import { planAdjustmentsBetween } from "./weeklyReport.service";

/** O recorde é contra o histórico: seis meses de séries antes do bloco bastam. */
const RECORD_LOOKBACK_DAYS = 182;
/** A sequência em semanas olha até um ano para trás. */
const STREAK_LOOKBACK_DAYS = 364;

/**
 * O relatório do bloco que acaba (#376, B4), de uma chamada, sob a sessão do
 * próprio aluno: a RLS das tabelas de saúde decide o que entra.
 *
 * @example const report = await createBlockReportService(supabase).fetchBlockReport(user.id, bloco);
 */
export const createBlockReportService = (supabase: SupabaseClient) => {
  const progress = createProgressService(supabase);
  const measurements = createMeasurementService(supabase);

  return {
    fetchBlockReport: async (studentId: string, block: BlockDates): Promise<BlockReport> => {
      const { start_date: start, end_date: end } = block;
      const [history, outline, sets, measured, planned, energy, adjustments, rests] =
        await Promise.all([
          progress.listActivityHistory(studentId),
          progress.getMealPlanOutline(studentId),
          progress.listCompletedSets(studentId, addDays(start, -RECORD_LOOKBACK_DAYS)),
          measurements.listMeasurements(studentId),
          countPrescribedWorkouts(supabase, studentId),
          practitionerEnergy(supabase, studentId),
          planAdjustmentsBetween(supabase, studentId, start, addDays(end, 1)),
          createRestService(supabase).recent(studentId),
        ]);
      return summarizeBlock({
        start,
        end,
        days: dailyActivities({
          from: addDays(start, -STREAK_LOOKBACK_DAYS),
          to: end,
          ...history,
          ...outline,
        }),
        sets,
        measurements: measured,
        plannedPerWeek: planned,
        energy,
        adjustments: {
          swaps: adjustments.filter((item) => item.kind === "swap").length,
          simplified: adjustments.filter((item) => item.kind === "simplified").length,
          // O "desfazer" volta ao que era: não é mais uma mudança.
          targets: adjustments.filter((item) => item.kind === "calories" && item.reason !== "undo")
            .length,
        },
        paused: pausedDays(rests, end),
      });
    },
  };
};

export type BlockReportService = ReturnType<typeof createBlockReportService>;
