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
  // Dois treinos: com um só, uma falha no meio do laço não tem "meio".
  "sessao-de-dois": {
    savedWorkouts: [],
    pendingWorkoutProposal: {
      phase_id: "fase-1",
      phase_name: "Adaptação",
      workouts: [{ title: "Treino A" }, { title: "Treino B" }],
    },
  },
};

let donoDaSessao: string | null;
let estadoGravado: { sessionId: string; patch: unknown } | null;
/** Em qual treino do laço a gravação quebra (1 = o primeiro). `null` = nenhum. */
let falharNoTreino: number | null;
/** Os ids que o desfazer mandou apagar. */
let apagados: string[];
/** Quantos treinos já entraram nesta requisição — o laço passa por `from` a cada volta. */
let treinosGravados: number;

vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

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
  let apagando = false;

  builder.insert = vi.fn(chain);
  builder.select = vi.fn(chain);
  builder.ilike = vi.fn(chain);
  builder.limit = vi.fn(chain);
  builder.delete = vi.fn(() => {
    apagando = true;
    return builder;
  });
  builder.in = vi.fn((_coluna: string, valores: string[]) => {
    if (apagando) {
      apagados.push(...valores);
      apagando = false;
    }
    return builder;
  });
  builder.single = async () => {
    treinosGravados += 1;
    if (falharNoTreino === treinosGravados) {
      return { data: null, error: { message: `treino ${treinosGravados} caiu` } };
    }
    return { data: { id: `workout-${treinosGravados}` }, error: null };
  };
  builder.maybeSingle = async () => ({ data: null, error: null });
  // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é thenable
  builder.then = (resolve: (value: unknown) => unknown) =>
    resolve({ data: [{ id: "ex-1", name: "Supino reto com barra" }], error: null });

  return {
    supabaseAdmin: {
      from: () => builder,
      // O que o banco faz: tira a chave do `state` e devolve o que estava lá.
      // A segunda chamada não acha mais nada — é essa a trava.
      rpc: async (nome: string, args: Record<string, unknown>) => {
        const estado = propostaDaConversa[args.p_session_id as string] as
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
  falharNoTreino = null;
  apagados = [];
  treinosGravados = 0;
  propostaDaConversa["sessao-antiga"] = {
    savedWorkouts: [],
    pendingWorkoutProposal: {
      phase_id: "fase-1",
      phase_name: "Adaptação",
      workouts: [{ title: "Treino A", exercises: [{ exercise_name: "Supino reto com barra" }] }],
    },
  };
  propostaDaConversa["sessao-de-dois"] = {
    savedWorkouts: [],
    pendingWorkoutProposal: {
      phase_id: "fase-1",
      phase_name: "Adaptação",
      workouts: [{ title: "Treino A" }, { title: "Treino B" }],
    },
  };
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

    // A chave pendente sai na reivindicação, dentro do banco — o que a rota
    // grava depois é só o registro do que foi aprovado.
    expect(propostaDaConversa["sessao-antiga"]).not.toHaveProperty("pendingWorkoutProposal");
    expect(estadoGravado?.patch).toMatchObject({
      resolvedWorkoutProposal: { savedTitles: ["Treino A"] },
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

/**
 * A trava contra gravar duas vezes.
 *
 * Duas abas, dois aparelhos, ou um retry depois do `maxDuration = 60` da
 * Vercel: todos liam a mesma proposta pendente e gravavam os mesmos treinos na
 * conta do aluno.
 */
describe("aprovar duas vezes", () => {
  it("a segunda aprovação não grava nada e responde que não há proposta", async () => {
    const primeira = await POST(pedido({ sessionId: "sessao-antiga" }), contexto);
    expect(primeira.status).toBe(200);

    const segunda = await POST(pedido({ sessionId: "sessao-antiga" }), contexto);

    expect(segunda.status).toBe(400);
    expect(await segunda.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });
});

/**
 * Uma falha no meio do laço gravava metade e deixava a proposta pendente —
 * clicar de novo duplicava a metade que já tinha passado.
 */
describe("quando a gravação falha no meio", () => {
  beforeEach(() => {
    donoDaSessao = "sessao-de-dois";
  });

  it("apaga os treinos que já tinham entrado", async () => {
    falharNoTreino = 2;

    const resposta = await POST(pedido({ sessionId: "sessao-de-dois" }), contexto);

    expect(resposta.status).toBe(500);
    expect(apagados).toEqual(["workout-1"]);
  });

  it("devolve a proposta à fila, para a pessoa poder tentar de novo", async () => {
    falharNoTreino = 2;

    await POST(pedido({ sessionId: "sessao-de-dois" }), contexto);

    expect(propostaDaConversa["sessao-de-dois"]).toHaveProperty("pendingWorkoutProposal");
  });

  it("não registra os treinos como salvos", async () => {
    falharNoTreino = 2;

    await POST(pedido({ sessionId: "sessao-de-dois" }), contexto);

    expect(estadoGravado).toBeNull();
  });
});
