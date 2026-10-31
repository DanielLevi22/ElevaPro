import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O plano mais simples do check-in (#376, A5c): montar não grava nada, e
 * aprovar grava a cópia que a pessoa viu (ADR-0020).
 */

let estadoDaConversa: Record<string, Record<string, unknown>>;
let estadoGravado: Record<string, unknown> | null;
let mensagens: string[];
let preparado: { ok: boolean; reason?: string; pending?: unknown };
let gravado: unknown;

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));
vi.mock("@/lib/api-auth", () => ({
  authorizeStudent: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "member" } }),
  authorizeLinkedSpecialist: async () => ({ ok: false, response: null }),
  authorizeStudentWithHealthConsent: async () => ({
    ok: true,
    caller: { id: "aluno-1", accountType: "member" },
  }),
}));
vi.mock("@/lib/supabase-titular", () => ({ clienteDoTitular: () => ({}) }));
vi.mock("@/modules/ai/services/practitionerPlan/simplerDiet", () => ({
  prepareSimplerDiet: async () => preparado,
  saveSimplerDiet: async (_ctx: unknown, pending: unknown) => {
    gravado = pending;
    return { dietPlanId: "dieta-2" };
  },
}));
vi.mock("@/modules/ai/services/studentCoachService", () => ({
  getOrCreateStudentCoachSession: async () => "sessao-1",
}));
vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-1",
  sessionOwnedBy: async () => "sessao-1",
  saveMessage: async (_sessao: string, _papel: string, texto: string) => {
    mensagens.push(texto);
    return "msg-1";
  },
  getSessionState: async () => estadoDaConversa["sessao-1"] ?? {},
  updateSessionState: async (_sessao: string, patch: Record<string, unknown>) => {
    estadoGravado = patch;
  },
}));
vi.mock("@/lib/supabase-admin", () => {
  const builder: Record<string, unknown> = {};
  builder.delete = () => builder;
  builder.in = async () => ({ data: null, error: null });
  return {
    supabaseAdmin: {
      from: () => builder,
      rpc: async (nome: string, args: Record<string, unknown>) => {
        const estado = estadoDaConversa[args.p_session_id as string];
        const chave = args.p_chave as string;
        if (nome === "devolver_proposta") {
          if (estado) estado[chave] = args.p_valor;
          return { data: null, error: null };
        }
        const valor = estado?.[chave] ?? null;
        if (estado) delete estado[chave];
        return { data: valor, error: null };
      },
    },
  };
});

const montar = (await import("../student/diet/simplify/route")).POST;
const aprovar = (await import("../student/diet/simplify/approve/route")).POST;

const pedido = (body: unknown = {}) =>
  new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

const PENDENTE = { checkInId: "c1", mealsBefore: 5, mealsAfter: 4, plan: {} };

beforeEach(() => {
  estadoDaConversa = { "sessao-1": {} };
  estadoGravado = null;
  mensagens = [];
  gravado = null;
  preparado = { ok: true, pending: PENDENTE };
});

describe("montar o plano mais simples", () => {
  it("deixa o cardápio pendente na conversa, sem gravar", async () => {
    const resposta = await montar(pedido({ checkInId: "c1" }), undefined);

    expect(resposta.status).toBe(200);
    expect(estadoGravado).toEqual({ pendingSimplerDiet: PENDENTE });
    expect(gravado).toBeNull();
  });

  it("sem o check-in, recusa dizendo o formato", async () => {
    const resposta = await montar(pedido({}), undefined);
    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toMatchObject({ expected: "{ checkInId: string }" });
  });

  // O servidor confere de novo: o app só oferece, e quem decide é a conta.
  it("semana que não pede simplificação é conflito, mesmo se o app pedir", async () => {
    preparado = { ok: false, reason: "not_simplifiable" };
    expect((await montar(pedido({ checkInId: "c1" }), undefined)).status).toBe(409);
    expect(estadoGravado).toBeNull();
  });
});

describe("aprovar o plano mais simples", () => {
  it("grava a cópia guardada e diz quantas refeições ficam", async () => {
    estadoDaConversa = { "sessao-1": { pendingSimplerDiet: PENDENTE } };

    const resposta = await aprovar(pedido({ mealsAfter: 1 }), undefined);

    expect(resposta.status).toBe(200);
    expect(gravado).toEqual(PENDENTE);
    expect(mensagens).toEqual([
      "✅ Plano mais simples aprovado: 4 refeições por dia, a mesma meta.",
    ]);
  });

  it("aprovar duas vezes grava uma vez só", async () => {
    estadoDaConversa = { "sessao-1": { pendingSimplerDiet: PENDENTE } };
    expect((await aprovar(pedido(), undefined)).status).toBe(200);
    expect((await aprovar(pedido(), undefined)).status).toBe(400);
  });
});
