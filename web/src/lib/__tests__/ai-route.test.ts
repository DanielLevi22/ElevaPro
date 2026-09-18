import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../rate-limit", () => ({ enforceRateLimit: vi.fn().mockResolvedValue(null) }));
vi.mock("../api-auth", () => ({ authenticatedUserId: vi.fn().mockResolvedValue(null) }));

import { withAiRoute } from "../ai-route";

const CONTEXTO = { params: Promise.resolve({}) };

/** O Next entrega `NextRequest`; para o invólucro basta a forma de `Request`. */
function req() {
  return new Request("https://x/api") as unknown as Parameters<
    Parameters<typeof withAiRoute>[0]
  >[0];
}

const AMBIENTE_COMPLETO = {
  ANTHROPIC_API_KEY: "sk-ant-real",
  SUPABASE_SERVICE_ROLE_KEY: "eyJreal",
  NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
};

let original: NodeJS.ProcessEnv;

beforeEach(() => {
  original = { ...process.env };
  Object.assign(process.env, AMBIENTE_COMPLETO);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = original;
  vi.restoreAllMocks();
});

describe("withAiRoute", () => {
  it("deixa a resposta do handler passar intacta", async () => {
    const rota = withAiRoute(async () => Response.json({ reply: "oi" }));

    const resposta = await rota(req(), CONTEXTO);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("X-Request-Id")).toMatch(/^[0-9a-f]{32}$/);
    await expect(resposta.json()).resolves.toEqual({ reply: "oi" });
  });

  // Prova negativa do defeito: sem o invólucro, a exceção sobe e o Next
  // devolve `500` com `text/html`. O cliente móvel sabe ler JSON com código e
  // só conseguia dizer "respondeu 500 com tipo desconhecido".
  it("converte exceção do handler em JSON tipado, nunca HTML", async () => {
    const rota = withAiRoute(async () => {
      throw new Error("modelo fora do ar");
    });

    const resposta = await rota(req(), CONTEXTO);

    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("content-type")).toContain("application/json");
    await expect(resposta.json()).resolves.toEqual({ error: "ai_unavailable" });
  });

  // "Mal configurado" e "o modelo falhou" exigem ações diferentes: a primeira
  // é do time, a segunda é tentar de novo. Somadas num código só, ninguém sabe
  // qual é — foi o que custou dias no preview.
  it("distingue configuração ausente de falha do modelo", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    const rota = withAiRoute(async () => Response.json({ reply: "nunca chega aqui" }));

    const resposta = await rota(req(), CONTEXTO);

    expect(resposta.status).toBe(503);
    await expect(resposta.json()).resolves.toEqual({ error: "server_misconfigured" });
  });

  it("não chama o handler quando o ambiente está incompleto", async () => {
    process.env.ANTHROPIC_API_KEY = "";
    const handler = vi.fn(async () => Response.json({}));

    await withAiRoute(handler)(req(), CONTEXTO);

    expect(handler).not.toHaveBeenCalled();
  });

  // Nome de variável de ambiente não é informação de cliente: quem consome a
  // API não precisa saber o inventário do nosso servidor.
  it("não vaza o nome da variável ausente na resposta", async () => {
    process.env.ANTHROPIC_API_KEY = "";

    const resposta = await withAiRoute(async () => Response.json({}))(req(), CONTEXTO);
    const corpo = JSON.stringify(await resposta.json());

    expect(corpo).not.toContain("ANTHROPIC");
  });

  it("repassa o contexto de rota dinâmica sem tocar", async () => {
    const contexto = { params: Promise.resolve({ studentId: "abc" }) };
    const rota = withAiRoute<typeof contexto>(async (_req, ctx) => Response.json(await ctx.params));

    const resposta = await rota(req(), contexto);

    await expect(resposta.json()).resolves.toEqual({ studentId: "abc" });
  });
});
