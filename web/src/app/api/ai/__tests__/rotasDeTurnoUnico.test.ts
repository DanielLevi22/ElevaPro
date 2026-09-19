import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AIProvider,
  ProviderStreamEvent,
  ProviderTurnOptions,
} from "@/modules/ai/providers/types";

/**
 * O contrato das rotas de resposta única, afirmado contra um provider falso.
 *
 * É o seam que a migração para o `AIProvider` tornou possível: antes, o SDK da
 * Anthropic vivia dentro de cada rota e conferir qualquer uma delas exigia
 * chamar a API de verdade. Agora dá para dizer "dado este texto do modelo, a
 * rota devolve exatamente isto" — sem rede, sem chave e sem custo.
 *
 * Os testes afirmam três coisas por rota: o formato que sai, o nível de modelo
 * pedido (`fast` ou `reasoning`, que era literal dentro do arquivo antes) e o
 * caminho de erro quando o modelo devolve algo que não dá para interpretar.
 */

interface Chamada {
  nivel: "fast" | "reasoning";
  options: ProviderTurnOptions;
}

let chamadas: Chamada[];
let respostaDoModelo: string;

function providerFalso(nivel: "fast" | "reasoning"): AIProvider {
  return {
    async *stream(options: ProviderTurnOptions): AsyncGenerator<ProviderStreamEvent> {
      chamadas.push({ nivel, options });
      yield {
        type: "turn_end",
        fullContent: [{ type: "text", text: respostaDoModelo }],
        stopReason: "end_turn",
      };
    },
  };
}

vi.mock("@/modules/ai/ai.config", () => ({
  aiProviders: { fast: providerFalso("fast"), reasoning: providerFalso("reasoning") },
}));

const authorizeMfaPrivilegedUser = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  authorizeUser: async () => ({ ok: true, caller: { id: "u-1", accountType: "specialist" } }),
  authorizeMfaPrivilegedUser: (...args: unknown[]) => authorizeMfaPrivilegedUser(...args),
  authorizeStudent: async () => ({ ok: true, caller: { id: "u-1", accountType: "student" } }),
  authorizeStudentWithHealthConsent: async () => ({
    ok: true,
    caller: { id: "u-1", accountType: "student" },
  }),
}));

/** O invólucro só confere ambiente; aqui ele não é o alvo. */
vi.mock("@/lib/ai-route", () => ({
  withAiRoute: (handler: unknown) => handler,
}));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => {
      const construtor: Record<string, unknown> = {};
      const encadeia = () => construtor;
      construtor.select = vi.fn(encadeia);
      construtor.eq = vi.fn(encadeia);
      construtor.order = vi.fn(encadeia);
      construtor.limit = vi.fn(encadeia);
      construtor.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
      construtor.single = vi.fn(async () => ({ data: null, error: null }));
      // biome-ignore lint/suspicious/noThenProperty: o construtor do PostgREST é thenable
      construtor.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return construtor;
    },
  },
}));

/** O `withAiRoute` entrega `(request, context)`; sem o segundo, o tipo não fecha. */
const contexto = { params: Promise.resolve({}) };

function pedido(corpo: unknown) {
  return new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(corpo),
    // biome-ignore lint/suspicious/noExplicitAny: o handler só usa `json()` do Request
  }) as any;
}

beforeEach(() => {
  chamadas = [];
  respostaDoModelo = "";
  authorizeMfaPrivilegedUser.mockResolvedValue({
    ok: true,
    caller: { id: "u-1", accountType: "specialist" },
  });
});

describe("guia de preparo", () => {
  it("devolve os passos que o modelo escreveu", async () => {
    const { POST } = await import("../nutrition/recipe/route");
    respostaDoModelo = '[{"step":1,"instruction":"Pique a cebola.","timerSeconds":null}]';

    const resposta = await POST(pedido({ mealName: "Omelete", ingredients: ["ovo"] }));

    expect(await resposta.json()).toEqual([
      { step: 1, instruction: "Pique a cebola.", timerSeconds: null },
    ]);
  });

  // O modelo costuma embrulhar JSON em cerca de markdown, e a rota tira antes
  // de parsear. Sem isso, toda resposta viraria 502.
  it("tolera a cerca de markdown ao redor do JSON", async () => {
    const { POST } = await import("../nutrition/recipe/route");
    respostaDoModelo = '```json\n[{"step":1,"instruction":"Bata os ovos."}]\n```';

    const resposta = await POST(pedido({ mealName: "Omelete", ingredients: ["ovo"] }));

    expect(resposta.status).toBe(200);
  });

  it("usa o nível rápido, e não o de raciocínio", async () => {
    const { POST } = await import("../nutrition/recipe/route");
    respostaDoModelo = "[]";

    await POST(pedido({ mealName: "Omelete", ingredients: ["ovo"] }));

    expect(chamadas[0].nivel).toBe("fast");
    expect(chamadas[0].options.maxTokens).toBe(1024);
  });

  // Resposta ilegível é 502 e não 200 com lista vazia: uma manda tentar de
  // novo, a outra faz a tela mostrar "sem passos" como se fosse a receita.
  it("recusa com 502 quando o modelo não devolve JSON", async () => {
    const { POST } = await import("../nutrition/recipe/route");
    respostaDoModelo = "desculpe, não consigo";

    const resposta = await POST(pedido({ mealName: "Omelete", ingredients: ["ovo"] }));

    expect(resposta.status).toBe(502);
  });

  it("nem chama o modelo sem os ingredientes", async () => {
    const { POST } = await import("../nutrition/recipe/route");

    const resposta = await POST(pedido({ mealName: "Omelete", ingredients: [] }));

    expect(resposta.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("análise de alimento por foto", () => {
  it("pede o nível de raciocínio e manda a imagem no bloco próprio", async () => {
    const { POST } = await import("../student/scan-food/route");
    // O prato precisa dos quatro macros desde a #298: resposta sem eles é 502.
    respostaDoModelo =
      '{"name":"Arroz","calories":130,"protein":2,"carbs":28,"fat":0,"confidence":0.9}';

    const resposta = await POST(pedido({ imageBase64: "AAAA", mimeType: "image/jpeg" }));

    expect(resposta.status).toBe(200);
    expect(chamadas[0].nivel).toBe("reasoning");

    const conteudo = chamadas[0].options.messages[0].content;
    expect(Array.isArray(conteudo) && conteudo[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "AAAA" },
    });
  });

  it("recusa sem imagem, sem gastar chamada", async () => {
    const { POST } = await import("../student/scan-food/route");

    const resposta = await POST(pedido({ mimeType: "image/jpeg" }));

    expect(resposta.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("treino em lote e negociação", () => {
  // LGPD, art. 46: uma senha válida sem TOTP não autoriza gerar dados de treino.
  it("não chama o modelo quando especialista ainda está em AAL1", async () => {
    const { POST } = await import("../workout/negotiate/route");
    authorizeMfaPrivilegedUser.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "mfa_required" }, { status: 403 }),
    });

    const response = await POST(
      pedido({
        split: "ABC",
        goal: "hipertrofia",
        studentLevel: "iniciante",
        exercisesList: "agachamento",
      }),
    );

    expect(response.status).toBe(403);
    expect(chamadas).toHaveLength(0);
  });

  it("também bloqueia geração em lote sem AAL2", async () => {
    const { POST } = await import("../workout/batch/route");
    authorizeMfaPrivilegedUser.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "mfa_required" }, { status: 403 }),
    });

    const response = await POST(
      pedido({
        phases: [{ name: "Base", focus: "Força", weeks: 4 }],
        split: "ABC",
        goal: "hipertrofia",
        studentLevel: "iniciante",
        exercisesList: "agachamento",
      }),
    );

    expect(response.status).toBe(403);
    expect(chamadas).toHaveLength(0);
  });

  it("devolve o mapa de treinos que o modelo montou", async () => {
    const { POST } = await import("../workout/batch/route");
    respostaDoModelo = '{"seg":{"exercises":[]}}';

    const resposta = await POST(
      pedido({
        phases: [{ name: "Base" }],
        split: "ABC",
        goal: "hipertrofia",
        studentLevel: "iniciante",
        exercisesList: "agachamento",
      }),
    );

    expect(resposta.status).toBe(200);
    expect(chamadas[0].options.maxTokens).toBe(4096);
  });

  it("recusa com 502 quando a negociação volta ilegível", async () => {
    const { POST } = await import("../workout/negotiate/route");
    respostaDoModelo = "não sei";

    const resposta = await POST(
      pedido({
        split: "ABC",
        goal: "hipertrofia",
        studentLevel: "iniciante",
        exercisesList: "agachamento",
      }),
    );

    expect(resposta.status).toBe(502);
  });
});

describe("resumo de adesão ao plano alimentar", () => {
  it("devolve o texto do modelo como resumo", async () => {
    const { POST } = await import("../nutrition/adherence/route");
    respostaDoModelo = "Adesão consistente nas refeições principais.";

    const resposta = await POST(
      pedido({
        planName: "Cutting",
        adherenceData: { totalMeals: 10, completedMeals: 8, logs: [] },
      }),
      contexto,
    );

    expect(await resposta.json()).toEqual({
      summary: "Adesão consistente nas refeições principais.",
    });
  });

  // Texto vazio não pode virar um resumo em branco na tela: o aluno leria
  // ausência de resposta como ausência de adesão.
  it("cai numa frase própria quando o modelo não escreve nada", async () => {
    const { POST } = await import("../nutrition/adherence/route");
    respostaDoModelo = "";

    const resposta = await POST(
      pedido({
        planName: "Cutting",
        adherenceData: { totalMeals: 0, completedMeals: 0, logs: [] },
      }),
      contexto,
    );

    expect((await resposta.json()).summary).toContain("Sem dados suficientes");
  });
});

describe("assistente da lista de compras", () => {
  it("leva o prompt de sistema em bloco, e não misturado na mensagem", async () => {
    const { POST } = await import("../nutrition/assistant/route");
    respostaDoModelo = "Compre o arroz a granel.";

    const resposta = await POST(
      pedido({ categories: [{ category: "Grãos", items: ["arroz"] }], promptType: "recipes" }),
      contexto,
    );

    expect(resposta.status).toBe(200);
    expect(chamadas[0].options.systemBlocks).toHaveLength(1);
    expect(chamadas[0].options.systemBlocks[0].text.length).toBeGreaterThan(0);
  });

  it("recusa sem categorias, sem gastar chamada", async () => {
    const { POST } = await import("../nutrition/assistant/route");

    const resposta = await POST(pedido({ categories: [], promptType: "recipes" }), contexto);

    expect(resposta.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("nutribot do aluno", () => {
  it("manda o histórico recente junto da pergunta", async () => {
    const { POST } = await import("../student/nutribot/route");
    respostaDoModelo = "Pode trocar por batata-doce.";

    const resposta = await POST(
      pedido({
        message: "posso trocar o arroz?",
        history: [
          { role: "user", content: "oi" },
          { role: "assistant", content: "olá" },
        ],
      }),
      contexto,
    );

    // `sugestao` entrou na #298; o app antigo lê só `reply`, que não muda.
    expect(await resposta.json()).toMatchObject({ reply: "Pode trocar por batata-doce." });

    const mensagens = chamadas[0].options.messages;
    expect(mensagens).toHaveLength(3);
    expect(mensagens[2]).toEqual({ role: "user", content: "posso trocar o arroz?" });
  });

  it("recusa mensagem vazia, sem gastar chamada", async () => {
    const { POST } = await import("../student/nutribot/route");

    const resposta = await POST(pedido({ message: "   " }), contexto);

    expect(resposta.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});
