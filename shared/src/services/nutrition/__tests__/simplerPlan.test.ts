import { describe, expect, it } from "vitest";
import { addDays } from "../../../utils/dateOnly";
import { supabaseByTable } from "../../__tests__/supabaseByTable";
import {
  createWeeklyCheckInService,
  currentWeekStart,
  type WeeklyCheckIn,
} from "../weeklyCheckIn.service";

const WEEK = currentWeekStart();
const MEALS = ["cafe", "lanche", "almoco", "tarde", "jantar"].map((id) => ({
  id,
  day_of_week: null,
}));

const CHECK_IN: WeeklyCheckIn = {
  id: "c1",
  week_start: WEEK,
  logging: "all",
  assessment_id: "m2",
  status: "pending",
  weight_origin: "manual",
};

/** As refeições marcadas da semana passada: o plano inteiro em `daysOnTarget` dias. */
function logs(daysOnTarget: number) {
  return Array.from({ length: daysOnTarget }, (_, day) =>
    MEALS.map((meal) => ({
      logged_date: addDays(WEEK, -7 + day),
      diet_meal_id: meal.id,
      completed: true,
    })),
  ).flat();
}

function database(daysOnTarget: number) {
  return supabaseByTable({
    student_specialists: { count: 0 },
    diet_plans: {
      rows: {
        target_calories: 2150,
        plan_type: "unique",
        start_date: addDays(WEEK, -30),
        meals: MEALS,
      },
    },
    student_anamnesis: {
      rows: {
        age: 30,
        height: 180,
        weight: 80,
        gender: "Masculino",
        main_goal: "Emagrecimento",
        training_days: 4,
        diet_screening: "allowed",
      },
    },
    physical_assessments: [
      { id: "m2", assessed_at: `${WEEK}T10:00:00Z`, weight_kg: 80.2 },
      { id: "m1", assessed_at: `${addDays(WEEK, -7)}T10:00:00Z`, weight_kg: 80 },
    ],
    workout_sessions: [],
    meal_logs: logs(daysOnTarget),
  });
}

describe("o plano mais simples (A5c)", () => {
  it("2 dias no plano: a meta fica, e o plano perde uma refeição", async () => {
    const { supabase } = database(2);
    const proposal = await createWeeklyCheckInService(supabase).proposal("aluno", CHECK_IN);

    if (proposal.kind !== "proposal") throw new Error(`esperava proposta, veio ${proposal.kind}`);
    expect(proposal.recalibration).toMatchObject({ verdict: "low_adherence", deltaCalories: 0 });
    expect(proposal.simplerPlan).toEqual({ adherenceDays: 2, mealsPerDay: 5, nextMealsPerDay: 4 });
  });

  it("com a semana seguida, não há o que simplificar", async () => {
    const { supabase } = database(6);
    const proposal = await createWeeklyCheckInService(supabase).proposal("aluno", CHECK_IN);
    if (proposal.kind !== "proposal") throw new Error(`esperava proposta, veio ${proposal.kind}`);
    expect(proposal.simplerPlan).toBeNull();
  });
});
