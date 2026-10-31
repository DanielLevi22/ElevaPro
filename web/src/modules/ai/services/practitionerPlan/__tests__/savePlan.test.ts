import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OnboardingPlanPending } from "../types";

let inserted: { tabela: string; linha: Record<string, unknown> }[];
let savedWorkouts: { titulos: string[]; dono: unknown } | null;
let createdDiet: { plano: Record<string, unknown>; refeicoes: unknown[] } | null;
let activated: string[];
let completion: Record<string, unknown> | null;
let completionFails: boolean;
let finished: {
  tabela: string;
  linha: Record<string, unknown>;
  filtros: Record<string, unknown>;
}[];

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (tabela: string) => ({
      update: (linha: Record<string, unknown>) => {
        const filtros: Record<string, unknown> = {};
        const cadeia = {
          eq: (coluna: string, valor: unknown) => {
            filtros[coluna] = valor;
            return cadeia;
          },
          is: (coluna: string, valor: unknown) => {
            filtros[`${coluna} is`] = valor;
            return cadeia;
          },
          neq: async (coluna: string, valor: unknown) => {
            filtros[`${coluna} !=`] = valor;
            finished.push({ tabela, linha, filtros });
            return { error: null };
          },
          // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
          then: (resolve: (value: unknown) => unknown) => {
            finished.push({ tabela, linha, filtros });
            return resolve({ error: null });
          },
        };
        return cadeia;
      },
      insert: (linha: Record<string, unknown>) => {
        inserted.push({ tabela, linha });
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
          // A dieta ativa antes da nova: é a que a ativação encerra.
          eq: () => ({
            is: () => ({ maybeSingle: async () => ({ data: { id: "dieta-0" }, error: null }) }),
          }),
        }),
      }),
    }),
  },
}));
vi.mock("../../workoutPersistence", () => ({
  saveWorkoutsWithExercises: async (treinos: { title: string }[], _fase: string, dono: unknown) => {
    savedWorkouts = { titulos: treinos.map((t) => t.title), dono };
    return [];
  },
}));
vi.mock("@elevapro/shared", async (original) => ({
  ...(await original<typeof import("@elevapro/shared")>()),
  createNutritionService: () => ({
    createDietPlanWithMeals: async (plano: Record<string, unknown>, refeicoes: unknown[]) => {
      createdDiet = { plano, refeicoes };
      return { id: "dieta-1" };
    },
    activateDietPlan: async (id: string) => {
      activated.push(id);
    },
  }),
  createAdaptiveAnamnesisService: () => ({
    save: async (entrada: Record<string, unknown>) => {
      if (completionFails) throw new Error("sem conexão");
      completion = entrada;
      return "not_applicable";
    },
  }),
}));

const { savePractitionerPlan } = await import("../savePlan");

const PENDING: OnboardingPlanPending = {
  scope: "both",
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
  trainingDays: 3,
  caloriesByTrainingDays: null,
  suggestedSwap: null,
  estimate: null,
};

/** A sessão do aluno: só lê a anamnese, para concluir o onboarding. */
const holder = {
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { responses: { age: 29, height: 172 } }, error: null }),
      }),
    }),
  }),
} as unknown as SupabaseClient;

const context = () => ({
  studentId: "aluno-1",
  titular: holder,
  registrar: vi.fn(),
});

describe("aprovar o plano do onboarding", () => {
  beforeEach(() => {
    inserted = [];
    savedWorkouts = null;
    createdDiet = null;
    activated = [];
    finished = [];
    completion = null;
    completionFails = false;
  });

  /**
   * TRAVA — aprovar conclui o onboarding na mesma operação. Em duas chamadas, a
   * segunda podia falhar com o plano já ativo: a tela dizia que não aprovou e o
   * guarda devolvia a pessoa ao onboarding sem proposta para aprovar de novo.
   * Falhar ao concluir lança, para a rota desfazer o treino e devolver a proposta.
   */
  it("conclui o onboarding com o plano, e sem concluir a aprovação falha", async () => {
    await savePractitionerPlan(context(), PENDING);
    expect(completion).toMatchObject({ studentId: "aluno-1", completed: true, selfGuided: true });

    completionFails = true;
    await expect(savePractitionerPlan(context(), PENDING)).rejects.toThrow();
  });

  it("ativa o treino do próprio aluno, sem especialista, com o esporte como opcional", async () => {
    const ctx = context();
    const { periodizationId } = await savePractitionerPlan(ctx, PENDING);

    const periodizacao = inserted.find((i) => i.tabela === "training_periodizations")?.linha;
    expect(periodizacao).toMatchObject({
      student_id: "aluno-1",
      specialist_id: null,
      status: "active",
      // O nome diz o que o plano é, e não que é o primeiro.
      name: "Hipertrofia · 1x por semana",
    });
    expect(ctx.registrar).toHaveBeenCalledWith(periodizationId);
    expect(savedWorkouts).toEqual({
      titulos: ["A", "Corrida"],
      dono: { specialistId: null, studentId: "aluno-1" },
    });
  });

  it("cria a dieta com a meta do código e as refeições aprovadas, e a ativa", async () => {
    const { dietPlanId } = await savePractitionerPlan(context(), PENDING);

    expect(dietPlanId).toBe("dieta-1");
    expect(createdDiet?.plano).toMatchObject({
      // O banco exige as datas: sem elas, a aprovação falhava com 23502.
      start_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      end_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      student_id: "aluno-1",
      specialist_id: null,
      name: "Hipertrofia · 2.000 kcal por dia",
      target_calories: 2000,
    });
    expect(createdDiet?.refeicoes).toEqual([
      {
        name: "Almoço",
        meal_time: "12:00",
        items: [{ food_id: "id-Arroz branco cozido", quantity: 150, unit: "g" }],
      },
    ]);
    expect(activated).toEqual(["dieta-1"]);
  });

  it("sem dieta pela triagem, grava só o treino", async () => {
    const { dietPlanId } = await savePractitionerPlan(context(), { ...PENDING, target: null });

    expect(dietPlanId).toBeNull();
    expect(createdDiet).toBeNull();
    expect(activated).toEqual([]);
  });

  it("encerra só o treino ativo anterior do próprio Praticante, e não o novo", async () => {
    const { periodizationId } = await savePractitionerPlan(context(), PENDING);
    expect(finished.filter((item) => item.tabela === "training_periodizations")).toEqual([
      {
        tabela: "training_periodizations",
        linha: { status: "completed", end_reason: "replaced" },
        filtros: {
          student_id: "aluno-1",
          status: "active",
          "specialist_id is": null,
          "id !=": periodizationId,
        },
      },
    ]);
  });

  it("só dieta não cria periodização nem encerra o treino que a pessoa já tem", async () => {
    const dietOnly = {
      ...PENDING,
      scope: "diet" as const,
      proposal: { ...PENDING.proposal, workouts: [] },
    };
    const { periodizationId, dietPlanId } = await savePractitionerPlan(context(), dietOnly);

    expect(periodizationId).toBeNull();
    expect(dietPlanId).toBe("dieta-1");
    expect(inserted.filter((i) => i.tabela === "training_periodizations")).toEqual([]);
    expect(finished.filter((item) => item.tabela === "training_periodizations")).toEqual([]);
  });

  // Encerrar, nunca apagar (#376): a dieta anterior fica `finished` pela
  // ativação, e aqui ganha o motivo — só a encerrada hoje, nunca a nova.
  it("a dieta anterior ganha o motivo de ter sido trocada", async () => {
    const { dietPlanId } = await savePractitionerPlan(context(), PENDING);
    expect(dietPlanId).toBe("dieta-1");
    expect(finished.find((item) => item.tabela === "diet_plans")).toMatchObject({
      linha: { end_reason: "replaced" },
      filtros: { status: "finished", id: "dieta-0" },
    });
  });
});
