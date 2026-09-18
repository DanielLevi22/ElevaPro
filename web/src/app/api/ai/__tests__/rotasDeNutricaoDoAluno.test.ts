import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AIProvider,
  ProviderStreamEvent,
  ProviderTurnOptions,
} from "@/modules/ai/providers/types";

/**
 * Os contratos das rotas de IA do fluxo de nutrição do aluno (issue #298, seam 8).
 *
 * Cada rota é afirmada contra um provider falso: dado o texto do modelo, o que
 * a rota devolve — e, nas que tratam dado de saúde, **o que ela deixa sair**
 * para o provedor. Os campos novos são opcionais: a resposta antiga continua
 * valendo, e o app antigo continua entendendo a rota nova.
 */

let chamadas: ProviderTurnOptions[];
let respostaDoModelo: string;
let consentiu: boolean;

function providerFalso(): AIProvider {
  return {
    async *stream(options: ProviderTurnOptions): AsyncGenerator<ProviderStreamEvent> {
      chamadas.push(options);
      yield {
        type: "turn_end",
        fullContent: [{ type: "text", text: respostaDoModelo }],
        stopReason: "end_turn",
      };
    },
  };
}

vi.mock("@/modules/ai/ai.config", () => ({
  aiProviders: { fast: providerFalso(), reasoning: providerFalso() },
}));

vi.mock("@/lib/api-auth", () => ({
  authorizeUser: async () => ({ ok: true, caller: { id: "aluno-1", accountType: "student" } }),
  authorizeStudentWithHealthConsent: async () =>
    consentiu
      ? { ok: true, caller: { id: "aluno-1", accountType: "student" } }
      : {
          ok: false,
          response: new Response(JSON.stringify({ error: "consent_required" }), { status: 403 }),
        },
}));

/** O invólucro só confere ambiente; aqui ele não é o alvo. */
vi.mock("@/lib/ai-route", () => ({ withAiRoute: (handler: unknown) => handler }));

vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: () => {
      const construtor: Record<string, unknown> = {};
      const encadeia = () => construtor;
      for (const metodo of ["select", "eq", "in", "order", "limit"]) {
        construtor[metodo] = vi.fn(encadeia);
      }
      construtor.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
      // biome-ignore lint/suspicious/noThenProperty: o construtor do PostgREST é thenable
      construtor.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return construtor;
    },
  },
}));

const contexto = { params: Promise.resolve({}) };

function pedido(corpo: unknown) {
  return new Request("https://x/api", {
    method: "POST",
    headers: { authorization: "Bearer t", "content-type": "application/json" },
    body: JSON.stringify(corpo),
    // biome-ignore lint/suspicious/noExplicitAny: o handler só usa `json()` do Request
  }) as any;
}

/** Tudo o que foi ao provedor, num texto só, para afirmar ausência. */
function oQueSaiu(): string {
  return JSON.stringify(chamadas);
}

beforeEach(() => {
  chamadas = [];
  respostaDoModelo = "";
  consentiu = true;
});

describe("scan do prato", () => {
  it("devolve os componentes com gramas quando o modelo os separa", async () => {
    const { POST } = await import("../student/scan-food/route");
    respostaDoModelo =
      '{"name":"Bowl","calories":260,"protein":20,"carbs":30,"fat":6,"confidence":0.8,' +
      '"components":[{"name":"Quinoa","grams":80,"calories":96,"protein":4,"carbs":17,"fat":2}]}';

    const resposta = await POST(pedido({ imageBase64: "AAAA" }));
    const corpo = await resposta.json();

    expect(corpo.components).toEqual([
      { name: "Quinoa", grams: 80, calories: 96, protein: 4, carbs: 17, fat: 2 },
    ]);
  });

  // Compatibilidade: o modelo que não separa componentes continua servindo, e o
  // app antigo lê os mesmos campos de sempre.
  it("aceita a resposta antiga, sem componentes", async () => {
    const { POST } = await import("../student/scan-food/route");
    respostaDoModelo =
      '{"name":"Arroz","calories":130,"protein":2,"carbs":28,"fat":0,"confidence":0.9}';

    const corpo = await (await POST(pedido({ imageBase64: "AAAA" }))).json();

    expect(corpo).toMatchObject({ name: "Arroz", calories: 130, components: [] });
  });

  it("pede ao modelo os componentes com gramas", async () => {
    const { POST } = await import("../student/scan-food/route");
    respostaDoModelo =
      '{"name":"Arroz","calories":130,"protein":2,"carbs":28,"fat":0,"confidence":0.9}';

    await POST(pedido({ imageBase64: "AAAA" }));

    expect(chamadas[0].systemBlocks[0].text).toContain('"components"');
  });

  it("resposta sem nome ou macros do prato é 502", async () => {
    const { POST } = await import("../student/scan-food/route");
    respostaDoModelo = '{"calories":130}';

    expect((await POST(pedido({ imageBase64: "AAAA" }))).status).toBe(502);
  });
});

describe("assistente de nutrição", () => {
  it("devolve a sugestão estruturada separada do texto", async () => {
    const { POST } = await import("../student/nutribot/route");
    respostaDoModelo =
      'Salmão fecha a meta.<sugestao>{"refeicao":"Jantar","itens":[' +
      '{"nome":"Salmão","gramas":160,"calorias":330,"proteina":32,"carboidrato":0,"gordura":21}]}</sugestao>';

    const corpo = await (await POST(pedido({ message: "o que janto?" }), contexto)).json();

    expect(corpo.reply).toBe("Salmão fecha a meta.");
    expect(corpo.sugestao).toEqual({
      refeicao: "Jantar",
      itens: [
        { nome: "Salmão", gramas: 160, calorias: 330, proteina: 32, carboidrato: 0, gordura: 21 },
      ],
    });
  });

  // Compatibilidade: o app antigo lê só `reply`, e a resposta sem sugestão é a
  // mais comum.
  it("sem sugestão, devolve só o texto e sugestao nula", async () => {
    const { POST } = await import("../student/nutribot/route");
    respostaDoModelo = "Beba água.";

    const corpo = await (await POST(pedido({ message: "e água?" }), contexto)).json();

    expect(corpo).toEqual({ reply: "Beba água.", sugestao: null });
  });

  it("ensina o modelo a mandar a sugestão aplicável no bloco", async () => {
    const { POST } = await import("../student/nutribot/route");
    respostaDoModelo = "ok";

    await POST(pedido({ message: "oi" }), contexto);

    expect(chamadas[0].systemBlocks[0].text).toContain("<sugestao>");
  });
});

describe("sugestões do assistente na busca", () => {
  const faltam = { calorias: 860, proteina: 32, carboidrato: 90, gordura: 20 };

  it("devolve até duas sugestões do modelo", async () => {
    const { POST } = await import("../student/sugestoes/route");
    respostaDoModelo =
      '[{"nome":"Salada de frango","calorias":320,"minutos":20,"destaque":"Alta proteína"}]';

    const corpo = await (await POST(pedido({ faltam, favoritas: ["Almoço"] }), contexto)).json();

    expect(corpo.sugestoes).toEqual([
      { nome: "Salada de frango", calorias: 320, minutos: 20, destaque: "Alta proteína" },
    ]);
  });

  // LGPD, Art. 6°, III: ao provedor vão só os macros que faltam e os nomes das
  // refeições favoritas. Um id, um nome ou um e-mail que o cliente mande a mais
  // não pode atravessar só porque chegou no corpo.
  it("ao provedor não vai identificador do aluno, nem o que o corpo trouxer a mais", async () => {
    const { POST } = await import("../student/sugestoes/route");
    respostaDoModelo = "[]";

    await POST(
      pedido({
        faltam,
        favoritas: ["Almoço"],
        student_id: "aluno-1-no-corpo",
        nome: "Daniel Levi",
        email: "daniel@exemplo.com",
      }),
      contexto,
    );

    const saiu = oQueSaiu();
    expect(saiu, "IDENTIFICADOR ENVIADO À IA: o id do aluno saiu no payload").not.toContain(
      "aluno-1",
    );
    expect(saiu, "NOME ENVIADO À IA").not.toContain("Daniel");
    expect(saiu, "E-MAIL ENVIADO À IA").not.toContain("exemplo.com");
    expect(saiu).toContain("860");
  });

  it("sem consentimento de saúde, recusa sem chamar o modelo", async () => {
    const { POST } = await import("../student/sugestoes/route");
    consentiu = false;

    const resposta = await POST(pedido({ faltam, favoritas: [] }), contexto);

    expect(resposta.status).toBe(403);
    expect(chamadas).toHaveLength(0);
  });

  it("recusa macros que não são número, sem gastar chamada", async () => {
    const { POST } = await import("../student/sugestoes/route");

    const resposta = await POST(pedido({ faltam: { calorias: "muito" }, favoritas: [] }), contexto);

    expect(resposta.status).toBe(400);
    expect(chamadas).toHaveLength(0);
  });
});

describe("preço estimado da lista de compras", () => {
  const categories = [{ category: "Proteínas", items: [{ name: "Frango", quantity: "1,4 kg" }] }];

  it("devolve o total estimado em reais", async () => {
    const { POST } = await import("../nutrition/assistant/route");
    respostaDoModelo = '{"total": 84.9}';

    const corpo = await (await POST(pedido({ categories, promptType: "price" }), contexto)).json();

    expect(corpo).toEqual({ precoEstimado: 84.9 });
  });

  // A lista vai com nome e quantidade — a quantidade é o que faz o preço. Nada
  // do aluno vai junto (LGPD, parecer da #298).
  it("manda nome e quantidade dos itens, e nada mais", async () => {
    const { POST } = await import("../nutrition/assistant/route");
    respostaDoModelo = '{"total": 84.9}';

    await POST(
      pedido({ categories, promptType: "price", planName: "Cutting do Daniel" }),
      contexto,
    );

    const mensagem = JSON.stringify(chamadas[0].messages);
    expect(mensagem).toContain("Frango");
    expect(mensagem).toContain("1,4 kg");
    expect(mensagem, "NOME DO PLANO ENVIADO À IA").not.toContain("Daniel");
  });

  it("estimativa ilegível devolve preço nulo, e a tela não mostra valor", async () => {
    const { POST } = await import("../nutrition/assistant/route");
    respostaDoModelo = "não sei estimar";

    const corpo = await (await POST(pedido({ categories, promptType: "price" }), contexto)).json();

    expect(corpo).toEqual({ precoEstimado: null });
  });
});
