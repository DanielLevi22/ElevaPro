import { describe, expect, it } from "vitest";
import { supabaseByTable } from "../../__tests__/supabaseByTable";
import { createBlockReportService } from "../blockReport.service";
import { createJourneyService } from "../journey.service";
import { createWeeklyReportService } from "../weeklyReport.service";

/** Meio-dia local: a data do dia não muda com o fuso. */
const noon = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12).toISOString();
};

const session = (date: string) => ({
  id: `s-${date}`,
  completed_at: noon(date),
  session_type: "strength",
  exercises: [],
});

/** Um Praticante com plano de 4 treinos por semana e dieta própria. */
function practitioner(extra: Record<string, unknown> = {}) {
  return supabaseByTable({
    workout_sessions: [session("2026-10-06"), session("2026-10-08"), session("2026-10-14")],
    meal_logs: [],
    diet_plans: {
      rows: {
        id: "diet",
        plan_type: "unique",
        start_date: "2026-09-01",
        meals: [],
        target_calories: 2900,
      },
    },
    training_periodizations: {
      rows: {
        id: "per-1",
        name: "Bloco 1",
        start_date: "2026-09-15",
        end_date: "2026-10-13",
        status: "completed",
        end_reason: "block_completed",
      },
    },
    training_plans: { rows: { id: "plan-1" } },
    workouts: { count: 4 },
    physical_assessments: [],
    plan_adjustments: [
      {
        before_value: 3231,
        after_value: 3081,
        reason: "weight_above_pace",
        approved_at: "2026-10-08T15:00:00Z",
      },
    ],
    exercise_swaps: [],
    exercises: [],
    rest_periods: [],
    student_anamnesis: { rows: null },
    ...extra,
  });
}

describe("fetchWeeklyReport", () => {
  it("monta a semana que fechou: treinos do plano, ajustes aprovados e a sequência", async () => {
    const { supabase } = practitioner();
    // Terça: o relatório é o da semana passada, de 05 a 11/10.
    const report = await createWeeklyReportService(supabase).fetchWeeklyReport("a", "2026-10-13");

    expect(report.weekStart).toBe("2026-10-05");
    expect(report.workouts).toEqual({ done: 2, planned: 4 });
    expect(report.adjustments).toEqual([
      {
        kind: "calories",
        before: 3231,
        after: 3081,
        reason: "weight_above_pace",
        at: "2026-10-08T15:00:00Z",
      },
    ]);
    expect(report.streakWeeks).toBeGreaterThanOrEqual(1);
  });

  it("semana sem dado nenhum vira estado vazio, sem erro", async () => {
    const { supabase } = supabaseByTable({});
    const report = await createWeeklyReportService(supabase).fetchWeeklyReport("a", "2026-10-13");
    expect(report.workouts.done).toBe(0);
    expect(report.adjustments).toEqual([]);
  });
});

describe("fetchBlockReport", () => {
  it("o bloco inteiro: treinos feitos, metas ajustadas e trocas", async () => {
    const { supabase } = practitioner();
    const report = await createBlockReportService(supabase).fetchBlockReport("a", {
      start_date: "2026-09-15",
      end_date: "2026-10-13",
    });
    // A sessão do dia 14 é depois do fim do bloco: não entra.
    expect(report.workouts).toEqual({ done: 2, planned: 16 });
    expect(report.changes).toEqual({ swaps: 0, targets: 1, simplified: 0 });
  });
});

describe("fetchJourney", () => {
  it("desde o primeiro plano, com os ajustes na linha do tempo", async () => {
    const { supabase } = practitioner({
      training_periodizations: {
        rows: [
          {
            name: "Bloco 1",
            start_date: "2026-09-15",
            end_date: "2026-10-13",
            status: "completed",
            end_reason: "block_completed",
          },
        ],
      },
    });
    const journey = await createJourneyService(supabase).fetchJourney("a", "2026-10-14");

    expect(journey.since).toBe("2026-09-15");
    expect(journey.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["start", "block", "target"]),
    );
  });

  it("sem plano nenhum, a jornada ainda não começou", async () => {
    const { supabase } = supabaseByTable({});
    const journey = await createJourneyService(supabase).fetchJourney("a", "2026-10-14");
    expect(journey.since).toBeNull();
    expect(journey.events).toEqual([]);
  });

  it("a tendência de peso fica na janela pedida", async () => {
    const { supabase } = practitioner({
      physical_assessments: [
        { id: "m1", assessed_at: "2026-06-01T10:00:00Z", measured_by: "self", weight_kg: 82 },
        { id: "m2", assessed_at: "2026-10-10T10:00:00Z", measured_by: "self", weight_kg: 80 },
      ],
    });
    const trend = await createJourneyService(supabase).fetchWeightTrend("a", "4w", "2026-10-14");
    expect(trend.weights.map((point) => point.weightKg)).toEqual([80]);
  });
});
