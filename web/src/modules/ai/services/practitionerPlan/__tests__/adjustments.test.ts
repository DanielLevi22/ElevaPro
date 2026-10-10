import type { OnboardingPlanPending } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { moreProtein, suggestSwap, swapFood } from "../adjustments";

const FOODS = [
  { name: "Frango (peito grelhado)", category: "proteina", serving_size: 100, calories: 160 },
  { name: "Carne moída (patinho)", category: "proteina", serving_size: 100, calories: 200 },
  { name: "Tilápia grelhada", category: "proteina", serving_size: 100, calories: 130 },
  { name: "Arroz branco cozido", category: "carboidrato", serving_size: 100, calories: 130 },
];

const PENDENTE: OnboardingPlanPending = {
  proposal: {
    workouts: [],
    meals: [
      {
        name: "Almoço",
        meal_time: "12:00",
        items: [
          { food_name: "Arroz branco cozido", quantity: 150 },
          { food_name: "Frango (peito grelhado)", quantity: 150 },
        ],
      },
    ],
    explanation: "",
  },
  target: { calories: 2000, protein: 150, carbs: 220, fat: 60, guards: [] },
  mealCalories: [435],
  goal: "Hipertrofia",
  level: "beginner",
  mealsPerDay: 1,
  sessionMinutes: 45,
  trainingDays: 3,
  suggestedSwap: null,
  estimate: null,
};

describe("trocar um alimento", () => {
  it("sugere trocar a proteína da maior refeição pela mais parecida da mesma categoria", () => {
    expect(suggestSwap(PENDENTE, FOODS)).toMatchObject({
      mealIndex: 0,
      itemIndex: 1,
      from: "Frango (peito grelhado)",
      to: "Tilápia grelhada",
    });
  });

  it("troca pela quantidade que dá as mesmas calorias, em degraus de 5 g", () => {
    const swap = suggestSwap(PENDENTE, FOODS);
    if (!swap) throw new Error("esperava uma sugestão de troca");
    const result = swapFood(PENDENTE, swap, FOODS);
    const item = result.proposal.meals?.[0].items[1];
    // 150 g de frango = 240 kcal; tilápia a 130/100 → ~185 g.
    expect(item).toEqual({ food_name: "Tilápia grelhada", quantity: 185 });
    expect(result.mealCalories[0]).toBe(Math.round(195 + 240.5));
  });

  it("sem dieta, não há o que trocar", () => {
    expect(
      suggestSwap(
        { ...PENDENTE, target: null, proposal: { ...PENDENTE.proposal, meals: null } },
        FOODS,
      ),
    ).toBeNull();
  });
});

describe("mais proteína", () => {
  /** As calorias não mudam: a meta é do código e as travas continuam valendo (ADR-0044). */
  it("sobe 20 g de proteína e tira 20 g de carboidrato, sem mexer nas calorias", () => {
    expect(moreProtein(PENDENTE.target)).toEqual({
      calories: 2000,
      protein: 170,
      carbs: 200,
      fat: 60,
      guards: [],
    });
  });

  it("sem dieta, não há meta para mexer", () => {
    expect(moreProtein(null)).toBeNull();
  });
});
