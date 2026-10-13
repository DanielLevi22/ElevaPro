import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O plano do onboarding do Praticante (#365): o seam "aprovação" da issue.
 * Gerar só deixa a proposta pendente; nada de treino ou dieta é gravado antes
 * de "Aprovar plano" (ADR-0020).
 */

let tabelasTocadas: string[];
let estadoGravado: Record<string, unknown> | null;
let consentiu: boolean;

const PENDENTE = {
  scope: "both",
  proposal: { workouts: [], meals: null, explanation: "" },
  target: null,
  goal: "Hipertrofia",
  level: "beginner",
  mealsPerDay: 4,
  mealCalories: [],
  sessionMinutes: 45,
  trainingDays: 3,
  suggestedSwap: null,
  estimate: null,
};

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));
vi.mock("@/lib/api-auth", () => ({
  authorizeStudentWithHealthConsent: async () =>
    consentiu
      ? { ok: true, caller: { id: "aluno-1", accountType: "member" } }
      : { ok: false, response: new Response(null, { status: 403 }) },
}));
vi.mock("@/modules/ai/services/practitionerPlan/generatePlan", () => ({
  generatePractitionerPlan: async () => ({ ok: true, pending: PENDENTE }),
}));
vi.mock("@/modules/ai/services/studentCoachService", () => ({
  getOrCreateStudentCoachSession: async () => "sessao-1",
}));
vi.mock("@/modules/ai/services/chatService", () => ({
  updateSessionState: async (_sessionId: string, patch: Record<string, unknown>) => {
    estadoGravado = patch;
  },
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (tabela: string) => {
      tabelasTocadas.push(tabela);
      throw new Error(`gravação inesperada em ${tabela}`);
    },
  },
}));

const { POST } = await import("../student/onboarding/plan/route");
const pedido = () =>
  new Request("http://localhost/api", { method: "POST" }) as unknown as NextRequest;

describe("gerar o plano do onboarding", () => {
  beforeEach(() => {
    tabelasTocadas = [];
    estadoGravado = null;
    consentiu = true;
  });

  /** TRAVA — ADR-0020: a IA propõe, e só a aprovação grava. */
  it("deixa a proposta pendente e não grava treino nem dieta", async () => {
    const resposta = await POST(pedido());

    expect(resposta.status).toBe(200);
    expect(estadoGravado).toEqual({ pendingOnboardingPlan: PENDENTE });
    if (tabelasTocadas.length > 0) {
      throw new Error(`PLANO GRAVADO SEM APROVAÇÃO: ${tabelasTocadas.join(", ")}`);
    }
  });

  it("sem o aceite de saúde, não gera", async () => {
    consentiu = false;
    const resposta = await POST(pedido());
    expect(resposta.status).toBe(403);
    expect(estadoGravado).toBeNull();
  });
});
