import { describe, expect, it } from "vitest";
import { type RecalibrationInput, recalibrateWeeklyTarget } from "../weeklyRecalibration";

/**
 * Perder gordura: gasto 2.700, meta 2.150 → 550 kcal/dia abaixo, ~0,5 kg por
 * semana esperados (550 × 7 ÷ 7.700).
 */
const CUT: RecalibrationInput = {
  logging: "all",
  weightKg: 77.5,
  previousWeightKg: 78,
  targetCalories: 2150,
  tdee: 2700,
  tmb: 1700,
};

describe("recalibrar a meta da semana", () => {
  it("mantém a meta quando o peso andou no ritmo esperado", () => {
    const result = recalibrateWeeklyTarget(CUT);
    expect(result.verdict).toBe("on_pace");
    expect(result.proposedCalories).toBe(2150);
  });

  it("baixa a meta quando o peso caiu menos que o esperado", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, weightKg: 77.9 });
    expect(result.verdict).toBe("weight_above_pace");
    expect(result.proposedCalories).toBe(2000);
  });

  it("sobe a meta quando o peso caiu mais rápido que o esperado", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, weightKg: 76.8 });
    expect(result.verdict).toBe("weight_below_pace");
    expect(result.proposedCalories).toBe(2300);
  });

  it("dá um passo só, por mais longe do ritmo que o peso esteja", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, weightKg: 79.5 });
    expect(result.proposedCalories).toBe(2000);
  });

  it("no ganho de massa, sobe a meta quando o peso subiu menos que o esperado", () => {
    const result = recalibrateWeeklyTarget({
      ...CUT,
      targetCalories: 2970,
      weightKg: 78,
      previousWeightKg: 78,
    });
    expect(result.verdict).toBe("weight_below_pace");
    expect(result.proposedCalories).toBe(3120);
  });

  it("mantém a meta com registro parcial: dado incompleto não sustenta ajuste", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, logging: "partial", weightKg: 77.9 });
    expect(result.verdict).toBe("insufficient_data");
    expect(result.proposedCalories).toBe(2150);
  });

  it("avalia pelo peso quem não registrou mas seguiu o plano", () => {
    const result = recalibrateWeeklyTarget({
      ...CUT,
      logging: "followed_unlogged",
      weightKg: 77.9,
    });
    expect(result.verdict).toBe("weight_above_pace");
  });

  it("não corta calorias de quem não seguiu o plano", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, logging: "not_followed", weightKg: 78.4 });
    expect(result.verdict).toBe("low_adherence");
    expect(result.proposedCalories).toBe(2150);
  });

  it("sem o peso desta semana ou da anterior, não há como ajustar", () => {
    expect(recalibrateWeeklyTarget({ ...CUT, weightKg: null }).verdict).toBe("insufficient_data");
    expect(recalibrateWeeklyTarget({ ...CUT, previousWeightKg: null }).verdict).toBe(
      "insufficient_data",
    );
  });

  it("nunca propõe meta abaixo da TMB: o passo para nela", () => {
    const result = recalibrateWeeklyTarget({
      ...CUT,
      tdee: 2400,
      targetCalories: 1750,
      weightKg: 77.9,
    });
    expect(result.proposedCalories).toBe(1700);
    expect(result.guard).toBe("bmr_floor");
  });

  it("já no piso, mantém a meta em vez de descer", () => {
    const result = recalibrateWeeklyTarget({
      ...CUT,
      tdee: 2400,
      targetCalories: 1700,
      weightKg: 77.9,
    });
    expect(result.verdict).toBe("weight_above_pace");
    expect(result.proposedCalories).toBe(1700);
    expect(result.deltaCalories).toBe(0);
  });

  it("nunca passa de ~1% do peso por semana de déficit", () => {
    // 78 kg × 11 kcal = 858 kcal de déficit máximo: 2.700 − 858 = 1.842.
    const result = recalibrateWeeklyTarget({
      ...CUT,
      targetCalories: 1900,
      tmb: 1500,
      weightKg: 78,
    });
    expect(result.proposedCalories).toBe(1850);
    expect(result.guard).toBe("weekly_rate_cap");
  });

  /** Regressão: com a meta em 3.231, arredondar a nova para 10 dava "−151 kcal" na tela. */
  it("o passo é sempre de 150 kcal, mesmo com meta que não é múltiplo de 10", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, targetCalories: 2151, weightKg: 77.9 });
    expect(result.deltaCalories).toBe(-150);
    expect(result.proposedCalories).toBe(2001);
  });

  it("devolve a variação esperada e a real para a tela explicar o porquê", () => {
    const result = recalibrateWeeklyTarget({ ...CUT, weightKg: 77.9 });
    expect(result.expectedChangeKg).toBeCloseTo(-0.5, 1);
    expect(result.actualChangeKg).toBeCloseTo(-0.1, 5);
  });
});
