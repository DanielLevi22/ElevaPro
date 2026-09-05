import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Aprovar grava tudo, ou não deixa rastro.
 *
 * O defeito que isto trava: as rotas liam a proposta pendente, gravavam, e só
 * então limpavam o pendente. Duas abas — ou um retry depois do `maxDuration`
 * da Vercel — passavam pela mesma porta e gravavam os mesmos treinos duas
 * vezes na conta do aluno.
 */

/** O `state` da conversa, do ponto de vista de quem chama as funções do banco. */
let pendente: unknown;
let erroAoReivindicar: { message: string } | null;
const devolvidas: Array<{ chave: string; valor: unknown }> = [];

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    rpc: async (nome: string, args: Record<string, unknown>) => {
      if (nome === "reivindicar_proposta") {
        if (erroAoReivindicar) return { data: null, error: erroAoReivindicar };
        // O que a função do banco faz: devolve o valor e o tira do state, de
        // modo que a chamada seguinte não acha mais nada.
        const valor = pendente ?? null;
        pendente = undefined;
        return { data: valor, error: null };
      }
      devolvidas.push({ chave: args.p_chave as string, valor: args.p_valor });
      pendente = args.p_valor;
      return { data: null, error: null };
    },
  },
}));

const { aprovarProposta } = await import("../aprovacaoDaProposta");

const PROPOSTA = { phase_id: "fase-1", phase_name: "Adaptação", workouts: [] };

beforeEach(() => {
  pendente = PROPOSTA;
  erroAoReivindicar = null;
  devolvidas.length = 0;
});

describe("aprovar a proposta", () => {
  it("grava o que foi reivindicado e devolve o resultado", async () => {
    const resultado = await aprovarProposta("sessao-1", "pendingWorkoutProposal", {
      gravar: async (proposta) => ({ recebeu: proposta }),
      desfazer: vi.fn(),
    });

    expect(resultado).toEqual({ recebeu: PROPOSTA });
  });

  // O segundo clique, a segunda aba, o retry que chegou tarde: todos caem aqui.
  it("a segunda aprovação não recebe proposta nenhuma", async () => {
    const gravar = vi.fn(async () => "gravou");

    await aprovarProposta("sessao-1", "pendingWorkoutProposal", { gravar, desfazer: vi.fn() });
    const segunda = await aprovarProposta("sessao-1", "pendingWorkoutProposal", {
      gravar,
      desfazer: vi.fn(),
    });

    expect(segunda).toBeNull();
    // O ponto: a segunda vez não chegou a gravar.
    expect(gravar).toHaveBeenCalledTimes(1);
  });

  it("proposta ausente devolve nada sem chamar o gravar", async () => {
    pendente = null;
    const gravar = vi.fn(async () => "gravou");

    expect(
      await aprovarProposta("sessao-1", "pendingDietPlan", { gravar, desfazer: vi.fn() }),
    ).toBeNull();
    expect(gravar).not.toHaveBeenCalled();
  });
});

describe("quando a gravação falha no meio", () => {
  it("desfaz o que entrou e devolve a proposta à fila", async () => {
    const desfazer = vi.fn(async () => {});

    await expect(
      aprovarProposta("sessao-1", "pendingWorkoutProposal", {
        gravar: async () => {
          throw new Error("treino 3 de 4 falhou");
        },
        desfazer,
      }),
    ).rejects.toThrow("treino 3 de 4 falhou");

    expect(desfazer).toHaveBeenCalledTimes(1);
    expect(devolvidas).toEqual([{ chave: "pendingWorkoutProposal", valor: PROPOSTA }]);
  });

  // Sem a devolução, a pessoa ficaria sem proposta e sem treinos — a
  // reivindicação é destrutiva por desenho, e o preço dela é ter a volta.
  it("depois de devolver, dá para aprovar de novo", async () => {
    await aprovarProposta("sessao-1", "pendingWorkoutProposal", {
      gravar: async () => {
        throw new Error("caiu");
      },
      desfazer: async () => {},
    }).catch(() => {});

    const segunda = await aprovarProposta("sessao-1", "pendingWorkoutProposal", {
      gravar: async (proposta) => proposta,
      desfazer: async () => {},
    });

    expect(segunda).toEqual(PROPOSTA);
  });

  // Desfazer que falha é o pior caso: linhas órfãs no banco. Ainda assim a
  // proposta precisa voltar, e o erro original é o que a pessoa vê.
  it("desfazer que falha não engole o erro original nem impede a devolução", async () => {
    await expect(
      aprovarProposta("sessao-1", "pendingWorkoutProposal", {
        gravar: async () => {
          throw new Error("insert falhou");
        },
        desfazer: async () => {
          throw new Error("delete também falhou");
        },
      }),
    ).rejects.toThrow("insert falhou");

    expect(devolvidas).toHaveLength(1);
  });

  it("falha ao reivindicar sobe como erro, não como proposta ausente", async () => {
    erroAoReivindicar = { message: "conexão perdida" };

    await expect(
      aprovarProposta("sessao-1", "pendingWorkoutProposal", {
        gravar: async () => "gravou",
        desfazer: vi.fn(),
      }),
    ).rejects.toThrow("conexão perdida");
  });
});
