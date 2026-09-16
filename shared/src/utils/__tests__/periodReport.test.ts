import { describe, expect, it } from "vitest";
import type { PhysicalAssessment } from "../../types/physicalAssessment.types";
import type { DailyActivity } from "../dailyActivity";
import { compositionChange, loadRecords, summarizePeriod } from "../periodReport";
import type { CompletedSet } from "../trainingProgress";

const FROM = "2026-06-17";
const TO = "2026-09-15";

const day = (date: string, extra: Partial<DailyActivity> = {}): DailyActivity => ({
  date,
  workouts: 0,
  cardioSessions: 0,
  plannedMeals: 0,
  doneMeals: 0,
  loggedMeals: 0,
  ...extra,
});

const set = (date: string, weight: number, extra: Partial<CompletedSet> = {}): CompletedSet => ({
  date,
  sessionId: `${date}-1`,
  exerciseId: "supino",
  exerciseName: "Supino",
  muscleGroup: "chest",
  reps: 8,
  weight,
  ...extra,
});

const measurement = (
  assessed_at: string,
  values: Partial<PhysicalAssessment>,
): PhysicalAssessment =>
  ({
    id: assessed_at,
    student_id: "aluno-1",
    specialist_id: null,
    measured_by: "self",
    assessed_at,
    ...values,
  }) as PhysicalAssessment;

describe("loadRecords", () => {
  // Sem histórico não há recorde: a primeira carga de um exercício é começo, e
  // chamá-la de recorde encheria o relatório de quem acabou de entrar.
  it("a primeira carga do exercício não é recorde", () => {
    expect(loadRecords([set("2026-07-01", 60)], FROM, TO)).toEqual([]);
  });

  it("a máxima do período acima de toda máxima anterior vira recorde", () => {
    const sets = [set("2026-05-01", 60), set("2026-07-01", 70), set("2026-08-01", 65)];

    expect(loadRecords(sets, FROM, TO)).toEqual([
      { exerciseId: "supino", name: "Supino", weight: 70, date: "2026-07-01" },
    ]);
  });

  it("carga do período abaixo do que já foi levantado antes não é recorde", () => {
    const sets = [set("2026-05-01", 100), set("2026-07-01", 80)];

    expect(loadRecords(sets, FROM, TO)).toEqual([]);
  });

  it("um recorde por exercício, do mais recente para o mais antigo", () => {
    const sets = [
      set("2026-05-01", 60),
      set("2026-07-01", 70),
      set("2026-05-02", 40, { exerciseId: "remada", exerciseName: "Remada" }),
      set("2026-08-10", 50, { exerciseId: "remada", exerciseName: "Remada" }),
    ];

    expect(loadRecords(sets, FROM, TO).map((record) => record.name)).toEqual(["Remada", "Supino"]);
  });
});

describe("compositionChange", () => {
  it("compara a primeira e a última medida da mesma origem", () => {
    const records = [
      measurement("2026-06-20T12:00:00Z", { weight_kg: 80, body_fat_pct: 20 }),
      measurement("2026-09-10T12:00:00Z", { weight_kg: 78.6, body_fat_pct: 18.5 }),
    ];

    expect(compositionChange(records, FROM, TO)).toEqual({
      source: "self",
      weightDelta: -1.4,
      fatDelta: -1.5,
    });
  });

  // ADR-0030: a fita do especialista e a medida declarada não entram na mesma
  // conta. Misturadas, a diferença de instrumento apareceria como progresso.
  it("não mistura a medida do especialista com a declarada", () => {
    const records = [
      measurement("2026-06-20T12:00:00Z", { weight_kg: 80, measured_by: "specialist" }),
      measurement("2026-09-10T12:00:00Z", { weight_kg: 74, measured_by: "self" }),
    ];

    const change = compositionChange(records, FROM, TO);

    if (change?.weightDelta === -6) {
      throw new Error("ORIGENS MISTURADAS: a variação somou fita do especialista com declaração");
    }
    expect(change).toBeNull();
  });

  it("com um registro só no período, não há variação", () => {
    expect(
      compositionChange([measurement("2026-07-01T12:00:00Z", { weight_kg: 80 })], FROM, TO),
    ).toBeNull();
  });
});

describe("summarizePeriod", () => {
  it("conta o que aconteceu dentro do período, e nada de fora", () => {
    const days = [
      day("2026-06-10", { workouts: 1, plannedMeals: 4, doneMeals: 4 }),
      day("2026-06-20", { workouts: 1, plannedMeals: 4, doneMeals: 3, loggedMeals: 3 }),
      day("2026-07-02", {
        workouts: 2,
        cardioSessions: 1,
        plannedMeals: 4,
        doneMeals: 4,
        loggedMeals: 4,
      }),
    ];

    const report = summarizePeriod({
      from: FROM,
      to: TO,
      today: "2026-09-15",
      days,
      sets: [set("2026-05-01", 60), set("2026-07-01", 70)],
      measurements: [measurement("2026-07-01T12:00:00Z", { weight_kg: 80 })],
    });

    // Três sessões dentro do período, uma delas de cardio: o cartão de treinos
    // mostra as de força, e o de cardio a outra — nunca a mesma nos dois.
    expect(report.panel.workouts).toBe(2);
    expect(report.panel.cardioSessions).toBe(1);
    expect(report.panel.adherence).toBe(88);
    expect(report.panel.measurements).toBe(1);
    expect(report.records).toHaveLength(1);
  });

  it("sem plano alimentar no período, a aderência é nula e não zero", () => {
    const report = summarizePeriod({
      from: FROM,
      to: TO,
      today: "2026-09-15",
      days: [day("2026-07-02", { workouts: 1 })],
      sets: [],
      measurements: [],
    });

    expect(report.panel.adherence).toBeNull();
  });
});
