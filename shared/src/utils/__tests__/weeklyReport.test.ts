import { describe, expect, it } from "vitest";
import type { PhysicalAssessment } from "../../types/physicalAssessment.types";
import type { DailyActivity } from "../dailyActivity";
import type { CompletedSet } from "../trainingProgress";
import { reportWeekStart, summarizeWeek, type WeeklyReportInput } from "../weeklyReport";

const MONDAY = "2026-10-05";

const day = (date: string, extra: Partial<DailyActivity> = {}): DailyActivity => ({
  date,
  workouts: 0,
  cardioSessions: 0,
  plannedMeals: 0,
  doneMeals: 0,
  loggedMeals: 0,
  ...extra,
});

const set = (date: string, weight: number): CompletedSet => ({
  date,
  sessionId: `${date}-1`,
  exerciseId: "supino",
  exerciseName: "Supino",
  muscleGroup: "chest",
  reps: 12,
  weight,
});

const weighing = (assessed_at: string, weight_kg: number): PhysicalAssessment =>
  ({ id: assessed_at, measured_by: "self", assessed_at, weight_kg }) as PhysicalAssessment;

const input = (extra: Partial<WeeklyReportInput> = {}): WeeklyReportInput => ({
  weekStart: MONDAY,
  days: [],
  sets: [],
  plannedWorkouts: 4,
  measurements: [],
  adjustments: [],
  ...extra,
});

describe("a semana do relatório", () => {
  it("no domingo é a que termina hoje; nos outros dias, a que já fechou", () => {
    expect(reportWeekStart("2026-10-11")).toBe("2026-10-05");
    expect(reportWeekStart("2026-10-13")).toBe("2026-10-05");
    expect(reportWeekStart("2026-10-12")).toBe("2026-10-05");
  });
});

describe("summarizeWeek", () => {
  it("semana sem nada vira estado vazio, sem erro", () => {
    const report = summarizeWeek(input());

    expect(report.tone).toBe("empty");
    expect(report.workouts).toEqual({ done: 0, planned: 4 });
    expect(report.diet).toBeNull();
  });

  it("todos os treinos prescritos fazem a semana completa; cardio não conta como treino", () => {
    const days = ["2026-10-05", "2026-10-07", "2026-10-09", "2026-10-11"].map((date) =>
      day(date, { workouts: 1 }),
    );
    days.push(day("2026-10-10", { workouts: 1, cardioSessions: 1 }));

    const report = summarizeWeek(input({ days }));

    expect(report.workouts.done).toBe(4);
    expect(report.tone).toBe("complete");
  });

  it("pouco treino e pouco registro é semana difícil; só um dos dois, não", () => {
    const hard = summarizeWeek(
      input({ days: [day("2026-10-06", { workouts: 1, plannedMeals: 4, loggedMeals: 2 })] }),
    );
    const dieted = summarizeWeek(
      input({
        days: ["05", "06", "07"].map((d) =>
          day(`2026-10-${d}`, { plannedMeals: 4, doneMeals: 4, loggedMeals: 4 }),
        ),
      }),
    );

    expect(hard.tone).toBe("hard");
    expect(dieted.tone).toBe("steady");
  });

  it("dieta: dias com o plano cumprido inteiro, dias registrados e dias planejados", () => {
    const days = [
      day("2026-10-05", { plannedMeals: 4, doneMeals: 4, loggedMeals: 4 }),
      day("2026-10-06", { plannedMeals: 4, doneMeals: 2, loggedMeals: 2 }),
      day("2026-10-07", { plannedMeals: 4 }),
    ];

    expect(summarizeWeek(input({ days })).diet).toEqual({
      daysOnTarget: 1,
      daysLogged: 2,
      daysPlanned: 3,
    });
  });

  it("peso: a última pesagem da semana contra a última de antes dela", () => {
    const measurements = [
      weighing("2026-09-28T09:00:00Z", 78.2),
      weighing("2026-10-05T09:00:00Z", 78.1),
      weighing("2026-10-11T09:00:00Z", 77.8),
    ];

    expect(summarizeWeek(input({ measurements })).weightChange).toBe(-0.4);
  });

  it("sem pesagem na semana, nada de variação inventada", () => {
    const measurements = [weighing("2026-09-28T09:00:00Z", 78.2)];

    expect(summarizeWeek(input({ measurements })).weightChange).toBeNull();
  });

  it("recorde é da semana, contra o histórico de antes dela", () => {
    const sets = [set("2026-09-30", 10), set("2026-10-07", 12.5)];

    expect(summarizeWeek(input({ sets })).records).toMatchObject([
      { name: "Supino", weight: 12.5, previousWeight: 10 },
    ]);
  });

  it("a sequência conta semanas com ao menos um treino, e uma semana vazia a interrompe", () => {
    const days = [
      day("2026-09-15", { workouts: 1 }),
      day("2026-09-29", { workouts: 1 }),
      day("2026-10-01", { workouts: 2 }),
      day("2026-10-08", { workouts: 1 }),
    ];

    expect(summarizeWeek(input({ days })).streakWeeks).toBe(2);
  });

  it("os ajustes vêm em ordem, do mais antigo ao mais recente", () => {
    const adjustments = [
      { kind: "swap" as const, summary: "Desenvolvimento → Elevação lateral", at: "2026-10-09" },
      {
        kind: "calories" as const,
        before: 2150,
        after: 2000,
        reason: "weight_below_pace" as const,
        at: "2026-10-05",
      },
    ];

    expect(summarizeWeek(input({ adjustments })).adjustments.map((item) => item.kind)).toEqual([
      "calories",
      "swap",
    ]);
  });
});
