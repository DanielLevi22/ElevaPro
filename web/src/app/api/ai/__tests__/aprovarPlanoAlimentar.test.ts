import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Qual conversa a aprovação do plano alimentar usa.
 *
 * A rota resolvia a sessão pela mais recente do módulo, e o cliente não mandava
 * qual estava aberta. Com mais de uma conversa de nutrição, aprovar na que
 * estava na tela lia o `state` de outra e respondia 400 "Nenhuma proposta
 * pendente encontrada" — verdadeiro sobre a conversa errada.
 */

const ALUNO = "aluno-1";
const ESPECIALISTA = "esp-1";

const PLANO = {
  name: "Cutting 2000 kcal",
  plan_type: "unique" as const,
  start_date: "2026-10-01",
  duration_weeks: 8,
  target_calories: 2000,
  target_protein: 150,
  target_carbs: 200,
  target_fat: 60,
};

const estadoDaConversa: Record<string, unknown> = {
  "sessao-antiga": { savedWorkouts: [], pendingDietPlan: PLANO },
  "sessao-recente": { savedWorkouts: [] },
};

let donoDaSessao: string | null;
let estadoGravado: { sessionId: string; patch: Record<string, unknown> } | null;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: ESPECIALISTA, accountType: "specialist" },
  }),
}));

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-recente",
  sessionOwnedBy: async (sessionId: string) => (donoDaSessao === sessionId ? sessionId : null),
  getSessionState: async (sessionId: string) => estadoDaConversa[sessionId],
  updateSessionState: async (sessionId: string, patch: Record<string, unknown>) => {
    estadoGravado = { sessionId, patch };
  },
  saveMessage: async () => undefined,
}));

vi.mock("@/lib/supabase-admin", () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.insert = vi.fn(chain);
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.single = async () => ({ data: { id: "plano-1", name: PLANO.name }, error: null });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
  return {
    supabaseAdmin: {
      from: () => builder,
      // O que o banco faz: tira a chave do `state` e devolve o que estava lá.
      // A segunda chamada não acha mais nada — é essa a trava.
      rpc: async (nome: string, args: Record<string, unknown>) => {
        const estado = estadoDaConversa[args.p_session_id as string] as
          | Record<string, unknown>
          | undefined;
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

const { POST } = await import("../nutrition/chat/[studentId]/save-plan/route");

const contexto = { params: Promise.resolve({ studentId: ALUNO }) };

function pedido(corpo: unknown): NextRequest {
  return new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(corpo),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  donoDaSessao = "sessao-antiga";
  estadoGravado = null;
  estadoDaConversa["sessao-antiga"] = { savedWorkouts: [], pendingDietPlan: PLANO };
});

describe("aprovar o plano alimentar", () => {
  it("salva o plano da conversa aberta, não o da mais recente", async () => {
    const resposta = await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    expect(resposta.status).toBe(200);
    expect(estadoGravado?.sessionId).toBe("sessao-antiga");
  });

  it("recusa conversa que não é deste aluno com este especialista", async () => {
    donoDaSessao = null;

    const resposta = await POST(pedido({ sessionId: "sessao-de-outro" }), contexto);

    expect(resposta.status).toBe(404);
    expect(estadoGravado).toBeNull();
  });

  // Sair da fila de decisão sem sair da tela: enquanto ficasse pendente, um
  // segundo clique salvaria o plano de novo.
  it("tira o plano da fila e o guarda para a tela poder mostrá-lo", async () => {
    await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    // A chave pendente sai na reivindicação, dentro do banco — o que a rota
    // grava depois é só o registro do que foi aprovado.
    expect(estadoDaConversa["sessao-antiga"]).not.toHaveProperty("pendingDietPlan");
    expect(estadoGravado?.patch).toMatchObject({ resolvedDietPlan: PLANO });
  });

  it("sem sessionId, cai na conversa mais recente", async () => {
    const resposta = await POST(pedido({}), contexto);

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });
});

// Duas abas, ou um retry depois do tempo: os dois liam o mesmo plano pendente e
// gravavam dois planos ativos para o mesmo aluno.
describe("aprovar o plano duas vezes", () => {
  it("a segunda aprovação não grava nada e responde que não há proposta", async () => {
    expect((await POST(pedido({ sessionId: "sessao-antiga" }), contexto)).status).toBe(200);

    const segunda = await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    expect(segunda.status).toBe(400);
    expect(await segunda.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });
});
