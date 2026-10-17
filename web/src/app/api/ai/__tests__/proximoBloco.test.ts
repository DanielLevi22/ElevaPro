import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O próximo bloco do Praticante (#376, B3–B5): montar não grava nada, e
 * aprovar grava a cópia que a pessoa viu (ADR-0020).
 */

let estadoDaConversa: Record<string, Record<string, unknown>>;
let estadoGravado: Record<string, unknown> | null;
let mensagens: string[];
let preparado: { ok: boolean; reason?: string; pending?: unknown };
let gravado: unknown;
let comConsentimento: boolean;

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

vi.mock("@/lib/api-auth", () => ({
  authorizeStudent: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "member" } }),
  authorizeLinkedSpecialist: async () => ({ ok: false, response: null }),
  authorizeStudentWithHealthConsent: async () =>
    comConsentimento
      ? { ok: true, caller: { id: "aluno-1", accountType: "member" } }
      : { ok: false, response: new Response(null, { status: 403 }) },
}));

vi.mock("@/lib/supabase-titular", () => ({ clienteDoTitular: () => ({}) }));

vi.mock("@/modules/ai/services/practitionerPlan/nextBlock", () => ({
  prepareNextBlock: async () => preparado,
}));

vi.mock("@/modules/ai/services/practitionerPlan/saveNextBlock", () => ({
  saveNextBlock: async (_ctx: unknown, pendente: unknown) => {
    gravado = pendente;
    return { periodizationId: "per-3", dietPlanId: null };
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

const montar = (await import("../student/block/next/route")).POST;
const aprovar = (await import("../student/block/approve/route")).POST;

const pedido = (body: unknown = {}) =>
  new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;

const PENDENTE = { blockNumber: 3, early: false, plan: {}, comparison: {} };

beforeEach(() => {
  estadoDaConversa = { "sessao-1": {} };
  estadoGravado = null;
  mensagens = [];
  gravado = null;
  comConsentimento = true;
  preparado = { ok: true, pending: PENDENTE };
});

describe("montar o próximo bloco (B3)", () => {
  it("deixa a proposta pendente na conversa, sem gravar o plano", async () => {
    const resposta = await montar(pedido({ changes: { training_days: 3 } }), undefined);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ block: PENDENTE });
    expect(estadoGravado).toEqual({ pendingNextBlock: PENDENTE });
    expect(gravado).toBeNull();
  });

  it("mudança com valor fora do catálogo é recusada, dizendo o formato", async () => {
    const resposta = await montar(pedido({ changes: { training_days: 99 } }), undefined);
    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toMatchObject({ error: "invalid_changes" });
  });

  it("bloco ainda correndo é conflito; quem tem especialista é recusado", async () => {
    preparado = { ok: false, reason: "block_running" };
    expect((await montar(pedido({ changes: {} }), undefined)).status).toBe(409);

    preparado = { ok: false, reason: "has_specialist" };
    expect((await montar(pedido({ changes: {} }), undefined)).status).toBe(403);
  });

  // Art. 11: gerar o plano lê dado de saúde, e as rotas de IA do aluno exigem
  // o consentimento vigente.
  it("sem o consentimento de saúde, não gera", async () => {
    comConsentimento = false;
    expect((await montar(pedido({ changes: {} }), undefined)).status).toBe(403);
    expect(estadoGravado).toBeNull();
  });
});

describe("aprovar o próximo bloco (B5)", () => {
  it("grava a cópia guardada, não o que o app mandou", async () => {
    estadoDaConversa = { "sessao-1": { pendingNextBlock: PENDENTE } };

    const resposta = await aprovar(pedido({ blockNumber: 99 }), undefined);

    expect(resposta.status).toBe(200);
    expect(gravado).toEqual(PENDENTE);
    expect(estadoDaConversa["sessao-1"]).not.toHaveProperty("pendingNextBlock");
  });

  it("aprovar duas vezes grava uma vez só", async () => {
    estadoDaConversa = { "sessao-1": { pendingNextBlock: PENDENTE } };
    expect((await aprovar(pedido(), undefined)).status).toBe(200);
    expect((await aprovar(pedido(), undefined)).status).toBe(400);
  });

  it("no fim do bloco, o novo começa hoje", async () => {
    estadoDaConversa = { "sessao-1": { pendingNextBlock: PENDENTE } };
    await aprovar(pedido(), undefined);
    expect(mensagens).toEqual(["✅ Bloco 3 aprovado: começa hoje."]);
  });

  // C2: trocado antes do fim, o bloco atual fecha hoje e o novo começa amanhã.
  it("trocado antes do fim, o novo começa amanhã", async () => {
    estadoDaConversa = { "sessao-1": { pendingNextBlock: { ...PENDENTE, early: true } } };
    await aprovar(pedido(), undefined);
    expect(mensagens).toEqual(["✅ Bloco 3 aprovado: começa amanhã."]);
  });
});
