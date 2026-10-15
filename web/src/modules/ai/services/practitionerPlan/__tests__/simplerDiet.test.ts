import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSimplerDiet } from "../simplerDiet";

const mockActivate = vi.fn();
const mockMarkEnded = vi.fn();
let rpcError: { message: string } | null;

vi.mock("@/lib/supabase-admin", () => ({ supabaseAdmin: {} }));
// A geração não é o que se testa aqui, e carregá-la puxa o SDK da IA.
vi.mock("../generatePlan", () => ({ generatePractitionerPlan: vi.fn() }));
vi.mock("../adjustPlan", () => ({ FASTER: "rápido" }));
vi.mock("../savePlan", () => ({
  activeOwnDietId: async () => "dieta-anterior",
  saveDiet: async () => "dieta-nova",
  markEndedDiet: (id: string, reason: string) => mockMarkEnded(id, reason),
}));
vi.mock("@elevapro/shared", async (original) => ({
  ...(await original<typeof import("@elevapro/shared")>()),
  createNutritionService: () => ({ activateDietPlan: (id: string) => mockActivate(id) }),
}));

const pending = { checkInId: "c1", mealsBefore: 5, mealsAfter: 4, plan: {} } as never;

function context() {
  const registered: string[] = [];
  return {
    registered,
    ctx: {
      studentId: "aluno-1",
      titular: { rpc: async () => ({ error: rpcError }) } as never,
      registrar: (id: string) => registered.push(id),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rpcError = null;
});

describe("saveSimplerDiet", () => {
  it("grava a dieta nova, encerra a anterior como trocada e registra o ajuste", async () => {
    const { ctx, registered } = context();

    expect(await saveSimplerDiet(ctx, pending)).toEqual({ dietPlanId: "dieta-nova" });
    expect(registered).toEqual(["dieta-nova"]);
    expect(mockMarkEnded).toHaveBeenCalledWith("dieta-anterior", "replaced");
    expect(mockActivate).not.toHaveBeenCalled();
  });

  // Se o registro do ajuste falhar, a anterior volta a valer e o desfazer da
  // aprovação apaga a nova: ninguém fica sem dieta ativa.
  it("se o registro falha, a dieta anterior volta e a nova fica para o desfazer", async () => {
    rpcError = { message: "check-in não está pendente" };
    const { ctx, registered } = context();

    await expect(saveSimplerDiet(ctx, pending)).rejects.toThrow("check-in não está pendente");
    expect(mockActivate).toHaveBeenCalledWith("dieta-anterior");
    expect(registered).toEqual(["dieta-nova"]);
    expect(mockMarkEnded).not.toHaveBeenCalled();
  });
});
