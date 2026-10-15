import { describe, expect, it } from "vitest";
import { addDays } from "../../../utils/dateOnly";
import { supabaseByTable } from "../../__tests__/supabaseByTable";
import { createWeeklyCheckInService, currentWeekStart } from "../weeklyCheckIn.service";

const WEEK = currentWeekStart();
const weekAgo = (weeks: number) => addDays(WEEK, -7 * weeks);

/** Quem quer emagrecer, com a meta em déficit, três semanas seguindo e o peso parado. */
function database({ specialists = 0, weightNow = 80 } = {}) {
  return supabaseByTable({
    student_specialists: { count: specialists },
    diet_plans: { rows: { target_calories: 2150 } },
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
      { id: "m4", assessed_at: `${WEEK}T10:00:00Z`, weight_kg: weightNow },
      { id: "m3", assessed_at: `${weekAgo(1)}T10:00:00Z`, weight_kg: 80.1 },
      { id: "m2", assessed_at: `${weekAgo(2)}T10:00:00Z`, weight_kg: 79.9 },
      { id: "m1", assessed_at: `${weekAgo(3)}T10:00:00Z`, weight_kg: 80 },
    ],
    weekly_check_ins: [
      { week_start: WEEK, logging: "all" },
      { week_start: weekAgo(1), logging: "all" },
      { week_start: weekAgo(2), logging: "followed_unlogged" },
    ],
  });
}

describe("a estagnação que antecipa a reavaliação (#376)", () => {
  it("três semanas com a meta seguida e o peso parado: a semana do gatilho", async () => {
    const { supabase } = database();
    expect(await createWeeklyCheckInService(supabase).stalledWeek("aluno")).toBe(WEEK);
  });

  it("o peso andou para o objetivo: nada a antecipar", async () => {
    const { supabase } = database({ weightNow: 78.8 });
    expect(await createWeeklyCheckInService(supabase).stalledWeek("aluno")).toBeNull();
  });

  // Com especialista, quem reavalia é ele (#376): o app não oferece nada.
  it("o Aluno com especialista não recebe o gatilho", async () => {
    const { supabase } = database({ specialists: 1 });
    expect(await createWeeklyCheckInService(supabase).stalledWeek("aluno")).toBeNull();
  });
});
