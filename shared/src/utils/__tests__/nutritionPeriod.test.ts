import { describe, expect, it } from "vitest";
import { type DailyIntake, summarizeNutrition } from "../nutritionPeriod";

const TODAY = "2026-09-15";

/** Um dia; o que não é dito fica sem plano e sem nada comido. */
function day(date: string, fields: Partial<DailyIntake> = {}): DailyIntake {
  return {
    date,
    plannedMeals: 0,
    doneMeals: 0,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    ...fields,
  };
}

describe("summarizeNutrition — números das 12 semanas", () => {
  it("a aderência é das refeições do período, com o delta em pontos contra as 12 semanas anteriores", () => {
    const days = [
      day("2026-09-15", { plannedMeals: 4, doneMeals: 3 }),
      day("2026-06-24", { plannedMeals: 4, doneMeals: 4 }), // 83 dias antes: ainda no período
      day("2026-06-23", { plannedMeals: 4, doneMeals: 2 }), // 84 dias antes: período anterior
    ];

    const { adherence } = summarizeNutrition(days, TODAY);

    expect(adherence.value).toBe(88);
    expect(adherence.delta).toBe(38);
  });

  // Dia sem nada registrado não é dia de zero caloria: é dia sem dado.
  it("a média de calorias e de proteína conta só os dias com algo registrado", () => {
    const days = [
      day("2026-09-15", { calories: 2000, protein: 150 }),
      day("2026-09-14", { calories: 2400, protein: 130 }),
      day("2026-09-13"),
    ];

    const { calories, protein } = summarizeNutrition(days, TODAY);

    expect(calories.value).toBe(2200);
    expect(protein.value).toBe(140);
  });

  it("sem registro no período, as médias e os deltas são nulos", () => {
    const { calories, protein } = summarizeNutrition([day("2026-09-15")], TODAY);

    expect(calories).toMatchObject({ value: null, delta: null });
    expect(protein).toMatchObject({ value: null, delta: null });
  });
});

describe("summarizeNutrition — séries", () => {
  it("dá a aderência das últimas 8 semanas, nula na semana sem plano", () => {
    const days = [
      day("2026-09-15", { plannedMeals: 2, doneMeals: 1 }),
      day("2026-09-08", { plannedMeals: 2, doneMeals: 2 }),
    ];

    const { weeklyAdherence } = summarizeNutrition(days, TODAY);

    expect(weeklyAdherence).toEqual([null, null, null, null, null, null, 100, 50]);
  });

  it("dá a média diária de calorias de cada uma das 12 semanas", () => {
    const days = [
      day("2026-09-15", { calories: 2000 }),
      day("2026-09-14", { calories: 1800 }),
      day("2026-06-24", { calories: 2500 }), // a primeira das 12 semanas
    ];

    const { weeklyCalories } = summarizeNutrition(days, TODAY);

    expect(weeklyCalories).toHaveLength(12);
    expect(weeklyCalories[0]).toBe(2500);
    expect(weeklyCalories[11]).toBe(1900);
    expect(weeklyCalories[5]).toBeNull();
  });

  it("os macros são a média diária dos dias com registro, em gramas inteiras", () => {
    const days = [
      day("2026-09-15", { calories: 2000, protein: 150, carbs: 200, fat: 70 }),
      day("2026-09-14", { calories: 1800, protein: 141, carbs: 181, fat: 61 }),
    ];

    expect(summarizeNutrition(days, TODAY).macros).toEqual({ protein: 146, carbs: 191, fat: 66 });
  });

  it("sem registro, não há macros", () => {
    expect(summarizeNutrition([], TODAY).macros).toBeNull();
  });
});
