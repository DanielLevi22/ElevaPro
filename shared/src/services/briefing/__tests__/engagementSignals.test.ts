import { describe, expect, it } from "vitest";
import { type EngagementFacts, engagementSignals } from "../engagementSignals";

const TODAY = "2026-10-14";
const LAST_WEEK = "2026-10-05";

function facts(over: Partial<EngagementFacts> = {}): EngagementFacts {
  return {
    studentId: "a",
    studentName: "Ana",
    sessionDays: 1,
    dietSince: "2026-09-01",
    lastMealLog: "2026-10-13",
    lastWeekCheckIn: true,
    resting: false,
    healthVisible: true,
    ...over,
  };
}

const kinds = (over: Partial<EngagementFacts>) =>
  engagementSignals(facts(over), TODAY, LAST_WEEK).map((signal) => signal.kind);

describe("engagementSignals (F8)", () => {
  it("quem está em dia não aparece", () => {
    expect(kinds({})).toEqual([]);
  });

  it("5 dias sem treino é risco, e vem sozinho", () => {
    expect(kinds({ sessionDays: 4 })).toEqual([]);
    expect(kinds({ sessionDays: 5, lastMealLog: null, lastWeekCheckIn: false })).toEqual([
      "inactive",
    ]);
  });

  it("refeições sem marcar há 5 dias, com a dieta valendo antes disso", () => {
    expect(kinds({ lastMealLog: "2026-10-09" })).toEqual(["meals_unlogged"]);
    expect(kinds({ lastMealLog: "2026-10-10" })).toEqual([]);
    expect(kinds({ lastMealLog: null, dietSince: "2026-10-12" })).toEqual([]);
  });

  it("o check-in da semana passada que não veio", () => {
    expect(kinds({ lastWeekCheckIn: false })).toEqual(["check_in_skipped"]);
    expect(kinds({ lastWeekCheckIn: false, dietSince: "2026-10-08" })).toEqual([]);
  });

  it("em Modo Descanso, nada: a pausa não é abandono", () => {
    expect(kinds({ resting: true, sessionDays: 30, lastMealLog: null })).toEqual([]);
  });

  it("com o consentimento revogado, o que a RLS esconde não vira sinal", () => {
    expect(kinds({ healthVisible: false, lastMealLog: null, lastWeekCheckIn: false })).toEqual([]);
    expect(kinds({ healthVisible: false, sessionDays: 9 })).toEqual(["inactive"]);
  });
});
