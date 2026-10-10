import type { PractitionerPlanProposal } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { scaleToTarget } from "../scaleToTarget";

const FOODS = new Map([
  ["Arroz branco cozido", { name: "Arroz branco cozido", serving_size: 100, calories: 130 }],
  ["Ovo inteiro cozido", { name: "Ovo inteiro cozido", serving_size: 50, calories: 70 }],
]);

const plano = (arroz: number, ovos: number): PractitionerPlanProposal => ({
  workouts: [],
  meals: [
    {
      name: "Almoço",
      meal_time: "12:00",
      items: [
        { food_name: "Arroz branco cozido", quantity: arroz },
        { food_name: "Ovo inteiro cozido", quantity: ovos },
      ],
    },
  ],
  explanation: "",
});

const calorias = (p: PractitionerPlanProposal) =>
  (p.meals ?? [])
    .flatMap((m) => m.items)
    .reduce((total, item) => {
      const food = FOODS.get(item.food_name);
      return food ? total + (food.calories * item.quantity) / food.serving_size : total;
    }, 0);

describe("scaleToTarget — o código acerta as porções na meta", () => {
  it("escala as quantidades para a meta, mantendo a proporção entre os alimentos", () => {
    // 200 g de arroz (260) + 100 g de ovo (140) = 400 kcal; meta 800 → fator 2.
    const result = scaleToTarget(plano(200, 100), FOODS, 800);
    expect(result).not.toBeNull();
    expect(Math.abs(calorias(result as PractitionerPlanProposal) - 800)).toBeLessThan(80);
  });

  it("arredonda as porções em degraus de 5 g, como se serve comida", () => {
    const result = scaleToTarget(plano(130, 50), FOODS, 333) as PractitionerPlanProposal;
    for (const item of result.meals?.[0].items ?? []) expect(item.quantity % 5).toBe(0);
  });

  it("recusa quando o plano está longe demais da meta para só escalar", () => {
    expect(scaleToTarget(plano(10, 0), FOODS, 2000)).toBeNull();
  });

  it("sem refeições (sem dieta), devolve o plano como veio", () => {
    const semDieta = { ...plano(0, 0), meals: null };
    expect(scaleToTarget(semDieta, FOODS, null)).toBe(semDieta);
  });
});
