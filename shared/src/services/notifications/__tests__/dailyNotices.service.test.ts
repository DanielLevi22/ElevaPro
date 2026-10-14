import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createDailyNoticesService } from "../dailyNotices.service";

// Quarta, 14/10/2026, 10h no fuso do aparelho.
const NOW = new Date(2026, 9, 14, 10, 0);
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute).toISOString();

function respostas(plan: { plan_type: string; meals: unknown[] } | null) {
  return [
    { data: plan },
    { data: [{ diet_meal_id: "cafe" }, { diet_meal_id: null }] },
    {
      data: {
        workouts: [
          { id: "a", title: "Treino A", day_of_week: "monday" },
          { id: "sem-dia", title: "Extra", day_of_week: null },
        ],
      },
    },
    {
      data: [
        { started_at: at(12, 18), completed_at: at(12, 19), session_type: "strength" },
        { started_at: at(13, 7, 30), completed_at: at(13, 8), session_type: "cardio" },
        { started_at: at(14, 6), completed_at: at(14, 7), session_type: "strength" },
      ],
    },
    { data: [] },
  ];
}

describe("fetchNoticeState", () => {
  it("monta o dia: refeições, o que foi marcado, treinos com dia e as sessões", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        plan_type: "cyclic",
        meals: [
          { id: "cafe", name: "Café", meal_time: "07:00", day_of_week: 3 },
          { id: "sem-hora", name: "Ceia", meal_time: null, day_of_week: 3 },
        ],
      }),
    );

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
    });
    // O horário de costume é o da musculação: o cardio das 7h30 não entra.
    expect(state.workoutStarts).toEqual([18 * 60, 6 * 60]);
  });

  it("no plano único, toda refeição vale todo dia", async () => {
    const { supabase } = criarSupabaseFake(
      respostas({
        plan_type: "unique",
        meals: [{ id: "almoco", name: "Almoço", meal_time: "12:00", day_of_week: 2 }],
      }),
    );
    const state = await createDailyNoticesService(supabase).fetchNoticeState("a", NOW);
    expect(state.meals[0].dayOfWeek).toBeNull();
  });

  // Art. 6°, III: o aviso só precisa saber se a refeição foi marcada e se o
  // treino foi feito. O que foi comido e as cargas não são lidos.
  it("não lê o que foi comido nem as cargas", async () => {
    const { supabase, chamadas } = criarSupabaseFake(respostas(null));
    await createDailyNoticesService(supabase).fetchNoticeState("a", NOW);

    const logs = chamadas.find((call) => call.tabela === "meal_logs");
    const sessions = chamadas.find((call) => call.tabela === "workout_sessions");
    if (logs?.select?.includes("actual_items")) {
      throw new Error("REFEIÇÃO LIDA: o aviso pediu o que a pessoa comeu");
    }
    expect(logs?.select).toBe("diet_meal_id");
    expect(sessions?.select).toBe("started_at, completed_at, session_type");
  });
});
