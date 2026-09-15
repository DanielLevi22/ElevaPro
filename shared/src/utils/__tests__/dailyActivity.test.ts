import { describe, expect, it } from "vitest";
import type { DietMeal, DietPlan } from "../../types/nutrition.types";
import { dailyActivities } from "../dailyActivity";

function meal(id: string, day_of_week: number | null = null): DietMeal {
  return { id, name: id, day_of_week } as DietMeal;
}

const PLAN = { plan_type: "unique", start_date: "2026-09-01" } as DietPlan;
const MEALS = [meal("cafe"), meal("almoco")];

describe("dailyActivities", () => {
  it("dá um dia por data do intervalo, com as sessões concluídas de cada um", () => {
    const days = dailyActivities({
      from: "2026-09-14",
      to: "2026-09-15",
      sessionDates: ["2026-09-15", "2026-09-15", "2026-09-10"],
      plan: null,
      meals: [],
      mealLogs: [],
    });

    expect(days.map((day) => [day.date, day.workouts])).toEqual([
      ["2026-09-14", 0],
      ["2026-09-15", 2],
    ]);
  });

  it("conta as refeições do plano no dia e as feitas entre elas", () => {
    const [day] = dailyActivities({
      from: "2026-09-15",
      to: "2026-09-15",
      sessionDates: [],
      plan: PLAN,
      meals: MEALS,
      mealLogs: [
        { logged_date: "2026-09-15", diet_meal_id: "cafe", completed: true },
        { logged_date: "2026-09-15", diet_meal_id: "almoco", completed: false },
        { logged_date: "2026-09-14", diet_meal_id: "almoco", completed: true },
      ],
    });

    expect(day).toMatchObject({ plannedMeals: 2, doneMeals: 1, loggedMeals: 1 });
  });

  // Plano cíclico: terça tem as refeições de terça, e não as da semana inteira.
  it("no plano cíclico, planeja só as refeições do dia da semana", () => {
    const [tuesday] = dailyActivities({
      from: "2026-09-15",
      to: "2026-09-15",
      sessionDates: [],
      plan: { ...PLAN, plan_type: "cyclic" },
      meals: [meal("ter", 2), meal("qua", 3)],
      mealLogs: [],
    });

    expect(tuesday.plannedMeals).toBe(1);
  });

  // Aderência de antes do plano existir seria cobrar refeição que ninguém prescreveu.
  it("antes do início do plano não há refeição planejada", () => {
    const [day] = dailyActivities({
      from: "2026-08-31",
      to: "2026-08-31",
      sessionDates: [],
      plan: PLAN,
      meals: MEALS,
      mealLogs: [],
    });

    expect(day.plannedMeals).toBe(0);
  });

  // A sequência conta refeição registrada, esteja ela no plano atual ou não.
  it("registrada conta toda refeição concluída do dia, mesmo fora do plano atual", () => {
    const [day] = dailyActivities({
      from: "2026-09-15",
      to: "2026-09-15",
      sessionDates: [],
      plan: null,
      meals: [],
      mealLogs: [{ logged_date: "2026-09-15", diet_meal_id: "de-outro-plano", completed: true }],
    });

    expect(day).toMatchObject({ plannedMeals: 0, doneMeals: 0, loggedMeals: 1 });
  });
});
