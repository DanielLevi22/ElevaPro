import { describe, expect, it } from "vitest";
import { assertServerEnv, instrucaoDeAmbiente, ServerEnvError } from "../server-env";

const COMPLETO = {
  ANTHROPIC_API_KEY: "sk-ant-real",
  SUPABASE_SERVICE_ROLE_KEY: "eyJreal",
  NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
};

describe("assertServerEnv", () => {
  it("passa quando todos os segredos de servidor existem", () => {
    expect(() => assertServerEnv(COMPLETO)).not.toThrow();
  });

  // Prova negativa do defeito que custou dias: a chave ausente no runtime
  // virava `500` com HTML, nascido dentro do SDK da Anthropic, sem nomear a
  // variável. Se a guarda sair, este teste falha dizendo o que se perdeu.
  it("recusa quando a chave da Anthropic falta, nomeando a consequência", () => {
    const env = { ...COMPLETO, ANTHROPIC_API_KEY: undefined };

    expect(() => assertServerEnv(env)).toThrow(ServerEnvError);
    expect(instrucaoDeAmbiente(["ANTHROPIC_API_KEY"])).toMatch(/rota \/api\/ai\/\* responde erro/);
  });

  it("recusa quando a service role falta — sem ela a RLS não é o controle, é o vazio", () => {
    const env = { ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: "" };

    expect(() => assertServerEnv(env)).toThrow(ServerEnvError);
    expect(instrucaoDeAmbiente(["SUPABASE_SERVICE_ROLE_KEY"])).toMatch(/em silêncio/);
  });

  // O `supabase-admin.ts` só reclamava de valor vazio. Um placeholder de
  // arquivo de exemplo passava pela checagem e falhava por request.
  it("recusa placeholder de arquivo de exemplo, que passa por 'não vazio'", () => {
    const env = { ...COMPLETO, SUPABASE_SERVICE_ROLE_KEY: "PREENCHER_service_role_key" };

    expect(() => assertServerEnv(env)).toThrow(ServerEnvError);
  });

  // Mesmo sintoma que derrubou o BFF do mobile: alguém interpolou a ausência
  // em vez de checá-la, e a palavra "undefined" virou o valor.
  it("trata a string literal 'undefined' como ausente", () => {
    const env = { ...COMPLETO, ANTHROPIC_API_KEY: "undefined" };

    expect(() => assertServerEnv(env)).toThrow(ServerEnvError);
  });

  it("lista todas as ausentes de uma vez, não só a primeira", () => {
    const env = {
      ANTHROPIC_API_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
    };

    try {
      assertServerEnv(env);
      expect.unreachable("deveria ter lançado");
    } catch (erro) {
      expect((erro as ServerEnvError).faltando).toEqual([
        "ANTHROPIC_API_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
      ]);
    }
  });

  // A mensagem tem que ensinar onde a variável mora, senão o próximo a ver o
  // erro repete o caminho: põe no GitHub Secrets e acha que resolveu.
  // A instrução ensina onde a variável mora, senão o próximo a ver o erro
  // repete o caminho: põe no GitHub Secrets e acha que resolveu.
  it("a instrução explica que variável de runtime não vem do passo de build", () => {
    expect(instrucaoDeAmbiente(["ANTHROPIC_API_KEY"])).toMatch(/no-op para o runtime/);
  });

  // Prova negativa do vazamento: `message` é o único campo que uma página de
  // erro renderiza sozinha, e uma rota nova que esqueça o invólucro faria
  // exatamente isso. Nome de variável e topologia ficam fora dela.
  it("a mensagem do erro não nomeia variável, host nem plataforma", () => {
    try {
      assertServerEnv({ ...COMPLETO, ANTHROPIC_API_KEY: undefined });
      expect.unreachable("deveria ter lançado");
    } catch (erro) {
      const mensagem = (erro as Error).message;
      expect(mensagem).not.toContain("ANTHROPIC");
      expect(mensagem).not.toContain("vercel");
      expect(mensagem).not.toContain("Vercel");
      expect(mensagem).not.toContain("env add");
    }
  });
});
