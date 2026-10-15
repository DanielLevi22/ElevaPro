import { describe, expect, it } from "vitest";
import { supabaseByTable } from "../../__tests__/supabaseByTable";
import { POLICY_VERSION } from "../../health/health.service";
import { createDailyNoticesService } from "../dailyNotices.service";

// Quarta, 14/10/2026, 10h no fuso do aparelho.
const NOW = new Date(2026, 9, 14, 10, 0);
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

const GRANTED = {
  given_at: "2026-09-01T10:00:00Z",
  revoked_at: null,
  policy_version: POLICY_VERSION,
};

function database(over: Record<string, unknown> = {}) {
  return supabaseByTable({
    student_consents: { rows: GRANTED },
    diet_plans: {
      rows: {
        plan_type: "cyclic",
        meals: [
          { id: "cafe", name: "Café", meal_time: "07:00", day_of_week: 3 },
          { id: "sem-hora", name: "Ceia", meal_time: null, day_of_week: 3 },
        ],
      },
      count: 1,
    },
    meal_logs: [{ diet_meal_id: "cafe" }, { diet_meal_id: null }],
    training_plans: {
      rows: {
        workouts: [
          { id: "a", title: "Treino A", day_of_week: "monday" },
          { id: "sem-dia", title: "Extra", day_of_week: null },
        ],
      },
    },
    workout_sessions: [
      { started_at: at(12, 18), completed_at: at(12, 19), session_type: "strength" },
      { started_at: at(13, 7, 30), completed_at: at(13, 8), session_type: "cardio" },
      { started_at: at(14, 6), completed_at: at(14, 7), session_type: "strength" },
    ],
    rest_periods: [],
    weekly_check_ins: { rows: null },
    ...over,
  });
}

describe("fetchNoticeState", () => {
  it("monta o dia: refeições, o que foi marcado, treinos com dia, sessões e o check-in", async () => {
    const { supabase } = database();

    const state = await createDailyNoticesService(supabase).fetchNoticeState("aluno-1", NOW);

    expect(state).toMatchObject({
      today: "2026-10-14",
      nowMinutes: 600,
      // Refeição sem hora não vira aviso: não há quando avisar.
      meals: [{ id: "cafe", name: "Café", time: "07:00", dayOfWeek: 3 }],
      loggedMealIds: ["cafe"],
      workouts: [{ id: "a", title: "Treino A", day: "monday" }],
      trainedToday: true,
      lastWorkoutDate: "2026-10-14",
      // Segunda (12), terça (13, cardio) e hoje.
      workoutsThisWeek: 3,
      checkInDue: true,
      healthConsent: true,
    });
    // O horário de costume é o da musculação: o cardio das 7h30 não entra.
    expect(state.workoutStarts).toEqual([18 * 60, 6 * 60]);
  });

  it("no plano único, toda refeição vale todo dia", async () => {
    const { supabase } = database({
      diet_plans: {
        rows: {
          plan_type: "unique",
          meals: [{ id: "almoco", name: "Almoço", meal_time: "12:00", day_of_week: 2 }],
        },
        count: 1,
      },
    });
    const state = await createDailyNoticesService(supabase).fetchNoticeState("a", NOW);
    expect(state.meals[0].dayOfWeek).toBeNull();
  });

  // Art. 6°, III: o aviso só precisa saber se a refeição foi marcada e se o
  // treino foi feito. O que foi comido e as cargas não são lidos.
  it("não lê o que foi comido nem as cargas", async () => {
    const { supabase, selects } = database();
    await createDailyNoticesService(supabase).fetchNoticeState("a", NOW);

    if (selects.meal_logs?.some((columns) => columns.includes("actual_items"))) {
      throw new Error("REFEIÇÃO LIDA: o aviso pediu o que a pessoa comeu");
    }
    expect(selects.meal_logs).toEqual(["diet_meal_id"]);
    expect(selects.workout_sessions).toEqual(["started_at, completed_at, session_type"]);
  });

  // Art. 11 e #344: ler para descartar ainda é tratamento. Com o consentimento
  // revogado, a dieta e os registros de refeição nem são consultados.
  it("com o consentimento revogado, não lê a dieta nem as refeições marcadas", async () => {
    const { supabase, selects } = database({
      student_consents: { rows: { ...GRANTED, revoked_at: "2026-10-10T10:00:00Z" } },
    });

    const state = await createDailyNoticesService(supabase).fetchNoticeState("a", NOW);

    if (selects.meal_logs) {
      throw new Error("REFEIÇÃO LIDA SEM CONSENTIMENTO: meal_logs foi consultada");
    }
    expect(state).toMatchObject({ healthConsent: false, meals: [], loggedMealIds: [] });
  });
});
