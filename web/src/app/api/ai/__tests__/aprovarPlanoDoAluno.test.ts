import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanProposalData } from "@/modules/ai/types";

/**
 * O aluno aprovando o próprio plano, pelo botão.
 *
 * Antes o botão mandava a frase "Aprovado! Pode salvar o plano." pelo chat e
 * torcia para o modelo agir — o mesmo desenho que travou a periodização em
 * laço, com uma rede de segurança embaixo. Rede embaixo do buraco não é o
 * buraco tapado: funcionava enquanto o modelo lembrasse de chamar a ferramenta.
 */

const PLANO = {
  workout: {
    split_name: "Push Pull Legs",
    goal: "hipertrofia",
    duration_weeks: 12,
    level: "intermediate",
    days: [{ day_label: "A", muscle_groups: ["peito"] }],
  },
  nutrition: { calories: 2400 },
} as unknown as PlanProposalData;

let estadoDaConversa: Record<string, Record<string, unknown>>;
let estadoGravado: { sessionId: string; patch: Record<string, unknown> } | null;
let gravado: PlanProposalData | null;
let falharAoGravar: boolean;
let apagados: string[];

vi.mock("@/lib/ai-route", () => ({ rotaDeIA: (handler: unknown) => handler }));

vi.mock("@/lib/api-auth", () => ({
  authorizeStudent: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "student" } }),
  authorizeLinkedSpecialist: async () => ({ ok: false, response: null }),
}));

vi.mock("@/modules/ai/services/studentCoachService", () => ({
  getOrCreateStudentCoachSession: async () => "sessao-1",
  saveStudentCoachPlan: async (
    _studentId: string,
    _sessionId: string,
    workout: unknown,
    nutrition: unknown,
  ) => {
    if (falharAoGravar) throw new Error("training_plans recusou os dias");
    gravado = { workout, nutrition } as PlanProposalData;
    return "periodizacao-1";
  },
}));

vi.mock("@/modules/ai/services/chatService", () => ({
  getOrCreateSession: async () => "sessao-1",
  sessionOwnedBy: async () => "sessao-1",
  saveMessage: async () => "msg-1",
  getSessionState: async () => estadoDaConversa["sessao-1"] ?? {},
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
      // segunda chamada não acha mais nada.
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

const { POST } = await import("../student/coach/save-plan/route");

const pedido = () =>
  new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t" },
  }) as unknown as NextRequest;

beforeEach(() => {
  estadoGravado = null;
  gravado = null;
  falharAoGravar = false;
  apagados = [];
  estadoDaConversa = { "sessao-1": { pendingStudentPlan: PLANO } };
});

describe("aprovar o plano do aluno", () => {
  it("salva a cópia guardada e devolve o id", async () => {
    const resposta = await POST(pedido(), undefined);

    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ id: "periodizacao-1", name: "Push Pull Legs" });
    expect(gravado?.workout).toEqual(PLANO.workout);
  });

  // Sair da fila de decisão sem sair da tela.
  it("guarda o aprovado com o id da periodização", async () => {
    await POST(pedido(), undefined);

    expect(estadoDaConversa["sessao-1"]).not.toHaveProperty("pendingStudentPlan");
    expect(estadoGravado?.patch).toEqual({
      resolvedStudentPlan: { plan: PLANO, periodizationId: "periodizacao-1" },
    });
  });

  // Sem reivindicação, dois cliques rápidos gravavam duas periodizações ativas
  // para o mesmo aluno.
  it("aprovar duas vezes grava uma vez só", async () => {
    expect((await POST(pedido(), undefined)).status).toBe(200);

    const segunda = await POST(pedido(), undefined);

    expect(segunda.status).toBe(400);
    expect(await segunda.json()).toEqual({ error: "Nenhuma proposta pendente encontrada." });
  });

  it("sem proposta pendente, responde que não há o que aprovar", async () => {
    estadoDaConversa = { "sessao-1": {} };

    expect((await POST(pedido(), undefined)).status).toBe(400);
    expect(gravado).toBeNull();
  });
});

describe("quando a gravação falha", () => {
  it("devolve o plano à fila, para o aluno poder tentar de novo", async () => {
    falharAoGravar = true;

    const resposta = await POST(pedido(), undefined);

    expect(resposta.status).toBe(500);
    expect(estadoDaConversa["sessao-1"]).toHaveProperty("pendingStudentPlan");
  });

  it("não registra nada como aprovado", async () => {
    falharAoGravar = true;

    await POST(pedido(), undefined);

    expect(estadoGravado).toBeNull();
  });
});
