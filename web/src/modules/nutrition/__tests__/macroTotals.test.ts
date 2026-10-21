import { describe, expect, it } from "vitest";
import {
  dailyTargets,
  describeRemaining,
  macrosForQuantity,
  quantityToClose,
  sumItemMacros,
  sumMealsMacros,
} from "../utils/macroTotals";

const chicken = { serving_size: 100, calories: 163, protein: 30, carbs: 0, fat: 4 };
const beans = { serving_size: 100, calories: 91, protein: 6, carbs: 16, fat: 1 };

describe("sumItemMacros", () => {
  it("escala cada alimento pela quantidade sobre a porção", () => {
    const totals = sumItemMacros([
      { quantity: 200, food: chicken },
      { quantity: 50, food: beans },
    ]);
    expect(totals).toEqual({ calories: 371.5, protein: 63, carbs: 8, fat: 8.5 });
  });

  it("ignora item sem alimento e macro nulo", () => {
    const totals = sumItemMacros([
      { quantity: 100, food: undefined },
      { quantity: 100, food: { ...beans, fat: null } },
    ]);
    expect(totals).toEqual({ calories: 91, protein: 6, carbs: 16, fat: 0 });
  });
});

describe("sumMealsMacros", () => {
  it("soma as refeições do dia", () => {
    const totals = sumMealsMacros([
      { meal_foods: [{ quantity: 100, food: chicken }] },
      { meal_foods: [{ quantity: 100, food: beans }] },
      { meal_foods: undefined },
    ]);
    expect(totals).toEqual({ calories: 254, protein: 36, carbs: 16, fat: 5 });
  });
});

describe("describeRemaining", () => {
  it("diz quanto falta abaixo da meta", () => {
    expect(describeRemaining(36.4, 187, "g")).toEqual({ text: "faltam 151g", tone: "below" });
  });

  it("dá a meta por batida quando fecha no inteiro", () => {
    expect(describeRemaining(186.6, 187, "g")).toEqual({ text: "na meta", tone: "met" });
  });

  it("aceita até 5% de folga para cima ou para baixo", () => {
    expect(describeRemaining(185, 180, "g")).toEqual({ text: "na meta, passou 5g", tone: "met" });
    expect(describeRemaining(2700, 2800, " kcal")).toEqual({
      text: "na meta, faltam 100 kcal",
      tone: "met",
    });
  });

  it("diz quanto passou além da folga", () => {
    expect(describeRemaining(3800, 3554, " kcal")).toEqual({
      text: "passou 246 kcal",
      tone: "over",
    });
  });

  it("não inventa progresso sem meta", () => {
    expect(describeRemaining(40, 0, "g")).toEqual({ text: "sem meta", tone: "none" });
  });
});

describe("dailyTargets", () => {
  it("troca meta ausente por zero", () => {
    const plan = { target_calories: 2800, target_protein: 180, target_carbs: null, target_fat: 75 };
    expect(dailyTargets(plan)).toEqual({ calories: 2800, protein: 180, carbs: 0, fat: 75 });
  });
});

describe("macrosForQuantity", () => {
  it("escala o alimento pela quantidade", () => {
    expect(macrosForQuantity(chicken, 150)).toEqual({
      calories: 244.5,
      protein: 45,
      carbs: 0,
      fat: 6,
    });
  });
});

describe("quantityToClose", () => {
  it("acha a quantidade que fecha o que falta do macro", () => {
    expect(quantityToClose(chicken, "protein", 45)).toBe(150);
  });

  it("devolve null quando o alimento não tem o macro", () => {
    expect(quantityToClose(chicken, "carbs", 50)).toBeNull();
  });

  it("devolve null quando não falta nada", () => {
    expect(quantityToClose(chicken, "protein", -5)).toBeNull();
  });
});
