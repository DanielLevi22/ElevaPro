import { describe, expect, it } from "vitest";
import { projectWeight } from "../weightProjection";

describe("projectWeight", () => {
  it("em déficit, projeta a perda com a faixa provável", () => {
    // 550 kcal/dia abaixo do gasto: 0,5 kg por semana; 8 kg em 16 semanas.
    const projection = projectWeight({ weightKg: 86, tdee: 2539, targetCalories: 1989 });
    expect(projection).toEqual({
      startKg: 86,
      weeks: 16,
      direction: "loss",
      likelyEndKg: { from: 78, to: 81.2 },
    });
  });

  it("em superávit, projeta o ganho", () => {
    expect(projectWeight({ weightKg: 70, tdee: 2500, targetCalories: 2750 })?.direction).toBe(
      "gain",
    );
  });

  it("em 4 semanas, a conta é a mesma, na janela do bloco", () => {
    // 550 kcal/dia abaixo: 2 kg em 4 semanas, de 1,2 a 2 kg na faixa provável.
    expect(
      projectWeight({ weightKg: 86, tdee: 2539, targetCalories: 1989, weeks: 4 })?.likelyEndKg,
    ).toEqual({ from: 84, to: 84.8 });
  });

  it("em manutenção, não há curva para desenhar", () => {
    expect(projectWeight({ weightKg: 70, tdee: 2500, targetCalories: 2480 })).toBeNull();
  });
});
