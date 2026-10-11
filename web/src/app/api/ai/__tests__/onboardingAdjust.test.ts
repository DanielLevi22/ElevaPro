import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** O10 · Ajustar: cada ajuste troca a versão pendente, e nada é gravado (ADR-0020). */

let estado: Record<string, unknown>;
let tabelasTocadas: string[];

const versao = (nome: string) => ({ proposal: { workouts: [], meals: null, explanation: nome } });

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));
vi.mock("@/lib/api-auth", () => ({
  authorizeStudentWithHealthConsent: async () => ({ ok: true, caller: { id: "aluno-1" } }),
}));
vi.mock("@/modules/ai/services/studentCoachService", () => ({
  getOrCreateStudentCoachSession: async () => "sessao-1",
}));
vi.mock("@/modules/ai/services/chatService", () => ({
  getSessionState: async () => estado,
  updateSessionState: async (_id: string, patch: Record<string, unknown>) => {
    estado = { ...estado, ...patch };
  },
}));
vi.mock("@/modules/ai/services/practitionerPlan/adjustPlan", () => ({
  adjustPractitionerPlan: async () => ({ ok: true, pending: versao("ajustada") }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: (tabela: string) => {
      tabelasTocadas.push(tabela);
      throw new Error(`gravação inesperada em ${tabela}`);
    },
  },
}));

const { POST } = await import("../student/onboarding/adjust/route");
const pedido = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

describe("ajustar o plano do onboarding", () => {
  beforeEach(() => {
    estado = { pendingOnboardingPlan: versao("original") };
    tabelasTocadas = [];
  });

  it("recusa ajuste desconhecido dizendo o formato esperado", async () => {
    const resposta = await POST(pedido({ kind: "mais_barato_ainda" }));
    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toMatchObject({
      error: "invalid_adjustment",
      expected: expect.stringContaining("training_days"),
    });
    expect((await POST(pedido({ kind: "training_days", days: 9 }))).status).toBe(400);
  });

  it("troca a versão pendente e guarda a anterior, sem gravar treino nem dieta", async () => {
    const resposta = await POST(pedido({ kind: "cheaper" }));

    expect(await resposta.json()).toMatchObject({ canUndo: true, plan: versao("ajustada") });
    expect(estado).toMatchObject({
      pendingOnboardingPlan: versao("ajustada"),
      previousOnboardingPlan: versao("original"),
    });
    if (tabelasTocadas.length > 0)
      throw new Error(`PLANO GRAVADO SEM APROVAÇÃO: ${tabelasTocadas.join(", ")}`);
  });

  it("desfazer devolve a versão anterior", async () => {
    await POST(pedido({ kind: "cheaper" }));
    const resposta = await POST(pedido({ kind: "undo" }));

    expect(await resposta.json()).toMatchObject({ canUndo: false, plan: versao("original") });
    expect(estado.pendingOnboardingPlan).toEqual(versao("original"));
    expect((await POST(pedido({ kind: "undo" }))).status).toBe(409);
  });

  it("sem plano pendente, não há o que ajustar", async () => {
    estado = {};
    expect((await POST(pedido({ kind: "faster" }))).status).toBe(409);
  });
});
