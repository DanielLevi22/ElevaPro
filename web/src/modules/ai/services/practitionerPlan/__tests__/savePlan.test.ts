import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingPlanPending } from "../types";

let inseridos: { tabela: string; linha: Record<string, unknown> }[];
let treinosGravados: { titulos: string[]; dono: unknown } | null;
let dietaCriada: { plano: Record<string, unknown>; refeicoes: unknown[] } | null;
let ativados: string[];

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (tabela: string) => ({
      insert: (linha: Record<string, unknown>) => {
        inseridos.push({ tabela, linha });
        return {
          select: () => ({ single: async () => ({ data: { id: `${tabela}-1` }, error: null }) }),
        };
      },
      select: () => ({
        eq: () => ({
          in: async (_coluna: string, nomes: string[]) => ({
            data: nomes.map((name) => ({ id: `id-${name}`, name, serving_unit: "g" })),
            error: null,
          }),
        }),
      }),
    }),
  },
}));
vi.mock("../../workoutPersistence", () => ({
  saveWorkoutsWithExercises: async (treinos: { title: string }[], _fase: string, dono: unknown) => {
    treinosGravados = { titulos: treinos.map((t) => t.title), dono };
    return [];
  },
}));
vi.mock("@elevapro/shared", async (original) => ({
  ...(await original<typeof import("@elevapro/shared")>()),
  createNutritionService: () => ({
    createDietPlanWithMeals: async (plano: Record<string, unknown>, refeicoes: unknown[]) => {
      dietaCriada = { plano, refeicoes };
      return { id: "dieta-1" };
    },
    activateDietPlan: async (id: string) => {
      ativados.push(id);
    },
  }),
}));

const { savePractitionerPlan } = await import("../savePlan");

const PENDENTE: OnboardingPlanPending = {
  proposal: {
    workouts: [
      { title: "A", day_of_week: "monday", optional: false, exercises: [] },
      { title: "Corrida", day_of_week: "saturday", optional: true, exercises: [] },
    ],
    meals: [
      {
        name: "Almoço",
        meal_time: "12:00",
        items: [{ food_name: "Arroz branco cozido", quantity: 150 }],
      },
    ],
    explanation: "",
  },
  target: { calories: 2000, protein: 150, carbs: 220, fat: 60, guards: [] },
  goal: "Hipertrofia",
  level: "beginner",
  mealsPerDay: 1,
  mealCalories: [195],
  sessionMinutes: 45,
};

const contexto = () => ({
  studentId: "aluno-1",
  titular: {} as SupabaseClient,
  registrar: vi.fn(),
});

describe("aprovar o plano do onboarding", () => {
  beforeEach(() => {
    inseridos = [];
    treinosGravados = null;
    dietaCriada = null;
    ativados = [];
  });

  it("ativa o treino do próprio aluno, sem especialista, com o esporte como opcional", async () => {
    const ctx = contexto();
    const { periodizationId } = await savePractitionerPlan(ctx, PENDENTE);

    const periodizacao = inseridos.find((i) => i.tabela === "training_periodizations")?.linha;
    expect(periodizacao).toMatchObject({
      student_id: "aluno-1",
      specialist_id: null,
      status: "active",
    });
    expect(ctx.registrar).toHaveBeenCalledWith(periodizationId);
    expect(treinosGravados).toEqual({
      titulos: ["A", "Corrida"],
      dono: { specialistId: null, studentId: "aluno-1" },
    });
  });

  it("cria a dieta com a meta do código e as refeições aprovadas, e a ativa", async () => {
    const { dietPlanId } = await savePractitionerPlan(contexto(), PENDENTE);

    expect(dietPlanId).toBe("dieta-1");
    expect(dietaCriada?.plano).toMatchObject({
      // O banco exige as datas: sem elas, a aprovação falhava com 23502.
      start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      student_id: "aluno-1",
      specialist_id: null,
      target_calories: 2000,
    });
    expect(dietaCriada?.refeicoes).toEqual([
      {
        name: "Almoço",
        meal_time: "12:00",
        items: [{ food_id: "id-Arroz branco cozido", quantity: 150, unit: "g" }],
      },
    ]);
    expect(ativados).toEqual(["dieta-1"]);
  });

  it("sem dieta pela triagem, grava só o treino", async () => {
    const { dietPlanId } = await savePractitionerPlan(contexto(), { ...PENDENTE, target: null });

    expect(dietPlanId).toBeNull();
    expect(dietaCriada).toBeNull();
    expect(ativados).toEqual([]);
  });
});
