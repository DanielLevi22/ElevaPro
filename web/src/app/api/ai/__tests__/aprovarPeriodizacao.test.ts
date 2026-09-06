import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Aprovar a periodização no cartão.
 *
 * Antes o botão mandava a frase "Aprovado! Pode salvar a periodização." pelo
 * chat, e o modelo é que deveria salvar. Só que o histórico que ele relê tem
 * apenas texto: ele chegava ao turno seguinte sem os dados da proposta,
 * propunha de novo para reconstruí-los, e pedia aprovação outra vez. Clicar
 * nunca salvava.
 */

const ALUNO = "aluno-1";
const ESPECIALISTA = "esp-1";

const PROPOSTA = {
  name: "Hipertrofia 12 Semanas",
  goal: "Hipertrofia",
  durationWeeks: 12,
  startDate: "2026-10-01",
  level: "Intermediário",
  phases: [{ name: "Adaptação", weeks: 12, focus: "Volume" }],
};

let estadoDaConversa: Record<string, Record<string, unknown>>;
let donoDaSessao: string | null;
let estadoGravado: { sessionId: string; patch: Record<string, unknown> } | null;
/** Quando a gravação da periodização quebra. */
let falharAoGravar: boolean;
/** Os ids que o desfazer mandou apagar. */
let apagados: string[];

vi.mock("@/lib/api-auth", () => ({
  authorizeLinkedSpecialist: async () => ({
    ok: true,
    caller: { id: ESPECIALISTA, accountType: "specialist" },
  }),
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-recente",
  sessionOwnedBy: async (sessionId: string) => (donoDaSessao === sessionId ? sessionId : null),
  saveMessage: async () => "msg-1",
  getSessionState: async () => estadoDaConversa["sessao-1"] ?? { savedWorkouts: [] },
  savePeriodization: async () => {
    if (falharAoGravar) throw new Error("training_plans recusou as fases");
    return "periodizacao-1";
  },
  updateSessionState: async (sessionId: string, patch: Record<string, unknown>) => {
    estadoGravado = { sessionId, patch };
  },
}));

vi.mock("@/lib/supabase-admin", () => {
  let apagando = false;
  const builder: Record<string, unknown> = {};
  builder.delete = () => {
    apagando = true;
    return builder;
  };
  builder.in = async (_coluna: string, valores: string[]) => {
    if (apagando) {
      apagados.push(...valores);
      apagando = false;
    }
    return { data: null, error: null };
  };

  return {
    supabaseAdmin: {
      from: () => builder,
      // O que o banco faz: tira a chave do `state` e devolve o que estava lá. A
      // segunda chamada não acha mais nada — é essa a trava contra gravar duas
      // periodizações com dois cliques.
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

const { POST } = await import("../chat/[studentId]/save-periodization/route");

const contexto = { params: Promise.resolve({ studentId: ALUNO }) };

function pedido(corpo: unknown): NextRequest {
  return new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(corpo),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  donoDaSessao = "sessao-1";
  estadoGravado = null;
  falharAoGravar = false;
  apagados = [];
  estadoDaConversa = {
    "sessao-1": { savedWorkouts: [], pendingPeriodization: PROPOSTA },
    "sessao-recente": { savedWorkouts: [] },
  };
});

describe("aprovar a periodização", () => {
  it("salva a cópia guardada e devolve o id", async () => {
    const resposta = await POST(pedido({ sessionId: "sessao-1" }), contexto);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ id: "periodizacao-1", name: PROPOSTA.name });
  });

  // Sair da fila de decisão sem sair da tela: reabrir a conversa precisa trazer
  // o cartão marcado como salvo, não pedindo aprovação de novo.
  it("guarda a aprovada com o id, para o cartão voltar marcado", async () => {
    await POST(pedido({ sessionId: "sessao-1" }), contexto);

    expect(estadoDaConversa["sessao-1"]).not.toHaveProperty("pendingPeriodization");
    expect(estadoGravado?.patch).toEqual({
      resolvedPeriodization: { proposal: PROPOSTA, id: "periodizacao-1" },
    });
  });

  it("recusa conversa que não é deste aluno com este especialista", async () => {
    donoDaSessao = null;

    const resposta = await POST(pedido({ sessionId: "sessao-de-outro" }), contexto);

    expect(resposta.status).toBe(404);
    expect(estadoGravado).toBeNull();
  });

  // Era o sintoma que a pessoa via: clicar em Aprovar várias vezes. Agora o
  // segundo clique não grava uma segunda periodização.
  it("aprovar duas vezes grava uma vez só", async () => {
    expect((await POST(pedido({ sessionId: "sessao-1" }), contexto)).status).toBe(200);

    const segunda = await POST(pedido({ sessionId: "sessao-1" }), contexto);

    expect(segunda.status).toBe(400);
    expect(await segunda.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });

  it("sem proposta pendente, responde que não há o que aprovar", async () => {
    donoDaSessao = "sessao-recente";

    const resposta = await POST(pedido({ sessionId: "sessao-recente" }), contexto);

    expect(resposta.status).toBe(400);
    expect(estadoGravado).toBeNull();
  });
});

describe("quando a gravação falha", () => {
  it("devolve a proposta à fila, para a pessoa poder tentar de novo", async () => {
    falharAoGravar = true;

    const resposta = await POST(pedido({ sessionId: "sessao-1" }), contexto);

    expect(resposta.status).toBe(500);
    expect(estadoDaConversa["sessao-1"]).toHaveProperty("pendingPeriodization");
  });

  it("não registra nada como aprovado", async () => {
    falharAoGravar = true;

    await POST(pedido({ sessionId: "sessao-1" }), contexto);

    expect(estadoGravado).toBeNull();
  });
});
