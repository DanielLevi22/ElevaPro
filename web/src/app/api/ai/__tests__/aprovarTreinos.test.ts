import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Qual conversa a aprovação de treinos usa.
 *
 * A proposta revisada no cartão vive no `state` da conversa que a produziu. A
 * rota resolvia a sessão com `getOrCreateSession` — a mais recente — então
 * aprovar numa conversa antiga da lateral lia o estado de outra e respondia
 * "Nenhuma proposta pendente encontrada" com a proposta na tela.
 */

const ALUNO = "aluno-1";
const ESPECIALISTA = "esp-1";

const propostaDaConversa: Record<string, unknown> = {
  "sessao-antiga": {
    savedWorkouts: [],
    pendingWorkoutProposal: {
      phase_id: "fase-1",
      phase_name: "Adaptação",
      workouts: [{ title: "Treino A", exercises: [{ exercise_name: "Supino reto com barra" }] }],
    },
  },
  "sessao-recente": { savedWorkouts: [] },
};

let donoDaSessao: string | null;
let estadoGravado: { sessionId: string; patch: unknown } | null;

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: ESPECIALISTA, accountType: "specialist" },
  }),
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-recente",
  sessionOwnedBy: async (sessionId: string) => (donoDaSessao === sessionId ? sessionId : null),
  getSessionState: async (sessionId: string) => propostaDaConversa[sessionId],
  updateSessionState: async (sessionId: string, patch: unknown) => {
    estadoGravado = { sessionId, patch };
  },
  saveMessage: async () => undefined,
}));

vi.mock("@/lib/supabase-admin", () => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.insert = vi.fn(chain);
  builder.select = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.ilike = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.single = async () => ({ data: { id: "workout-1" }, error: null });
  builder.maybeSingle = async () => ({ data: null, error: null });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: [{ id: "ex-1", name: "Supino reto com barra" }], error: null });
  return { supabaseAdmin: { from: () => builder } };
});

const { POST } = await import("../chat/[studentId]/save-workouts/route");

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
});

describe("aprovar treinos", () => {
  it("salva a proposta da conversa aberta, não a da mais recente", async () => {
    const resposta = await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ saved: [{ id: "workout-1", title: "Treino A" }] });
    expect(estadoGravado?.sessionId).toBe("sessao-antiga");
  });

  // Sair da fila de decisão sem sair da tela: continuar "pendente" deixaria um
  // segundo clique salvar os mesmos treinos, e sumir de vez deixava a conversa
  // anunciando "aprovados e salvos" sem nada para mostrar ao reabrir.
  it("tira a proposta da fila e a guarda com os títulos salvos", async () => {
    await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    expect(estadoGravado?.patch).toMatchObject({
      pendingWorkoutProposal: undefined,
      resolvedWorkoutProposal: {
        savedTitles: ["Treino A"],
      },
    });
  });

  it("recusa conversa que não é deste aluno com este especialista", async () => {
    donoDaSessao = null;

    const resposta = await POST(pedido({ sessionId: "sessao-de-outro" }), contexto);

    expect(resposta.status).toBe(404);
    expect(estadoGravado).toBeNull();
  });

  // O cliente antigo não manda `sessionId`; retomar a mais recente é o que ele
  // espera, e nesse caso não há proposta pendente para aprovar.
  it("sem sessionId, cai na conversa mais recente", async () => {
    const resposta = await POST(pedido({}), contexto);

    expect(resposta.status).toBe(400);
    expect(await resposta.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });
});
