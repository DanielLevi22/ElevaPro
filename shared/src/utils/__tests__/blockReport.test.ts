import { describe, expect, it } from "vitest";
import type { PhysicalAssessment } from "../../types/physicalAssessment.types";
import { type BlockReportInput, summarizeBlock } from "../blockReport";
import type { DailyActivity } from "../dailyActivity";

const START = "2026-09-15";
const END = "2026-10-13";

const day = (date: string, extra: Partial<DailyActivity> = {}): DailyActivity => ({
  date,
  workouts: 0,
  cardioSessions: 0,
  plannedMeals: 0,
  doneMeals: 0,
  loggedMeals: 0,
  ...extra,
});

const measure = (assessed_at: string, weight_kg: number, circ_waist?: number) =>
  ({
    id: assessed_at,
    measured_by: "self",
    assessed_at,
    weight_kg,
    circ_waist,
  }) as PhysicalAssessment;

/** 550 kcal/dia abaixo do gasto: 2 kg em 4 semanas na conta linear, 1,2 kg na conservadora. */
const input = (extra: Partial<BlockReportInput> = {}): BlockReportInput => ({
  start: START,
  end: END,
  days: [],
  sets: [],
  measurements: [
    measure("2026-09-14T09:00:00Z", 86, 90),
    measure("2026-10-12T09:00:00Z", 84.5, 87),
  ],
  plannedPerWeek: 4,
  energy: { tdee: 2539, targetCalories: 1989 },
  adjustments: { swaps: 1, targets: 1, simplified: 0 },
  ...extra,
});

describe("o relatório do bloco (B4)", () => {
  it("dentro da faixa prometida está no combinado; o antes e o depois na mesma origem", () => {
    const report = summarizeBlock(input());
    expect(report.promisedKg).toEqual({ from: -1.2, to: -2 });
    expect(report.realKg).toBe(-1.5);
    expect(report.verdict).toBe("on_track");
    expect(report.weight).toEqual({ before: 86, after: 84.5 });
    expect(report.waist).toEqual({ before: 90, after: 87 });
  });

  it("além da conta linear está à frente; aquém da faixa, atrás", () => {
    const ahead = input({
      measurements: [measure("2026-09-14T09:00:00Z", 86), measure("2026-10-12T09:00:00Z", 83.5)],
    });
    const behind = input({
      measurements: [measure("2026-09-14T09:00:00Z", 86), measure("2026-10-12T09:00:00Z", 85.8)],
    });
    expect(summarizeBlock(ahead).verdict).toBe("ahead");
    expect(summarizeBlock(behind).verdict).toBe("behind");
  });

  it("sem dieta ou sem pesagem no bloco, não há promessa para comparar", () => {
    expect(summarizeBlock(input({ energy: null })).verdict).toBe("no_promise");
    expect(
      summarizeBlock(input({ measurements: [measure("2026-09-14T09:00:00Z", 86)] })).verdict,
    ).toBe("no_promise");
  });

  it("treinos do bloco contra os prescritos nas 4 semanas, sem o cardio", () => {
    const days = [
      day("2026-09-16", { workouts: 1 }),
      day("2026-09-20", { workouts: 2, cardioSessions: 1 }),
    ];
    expect(summarizeBlock(input({ days })).workouts).toEqual({ done: 2, planned: 16 });
  });
});
