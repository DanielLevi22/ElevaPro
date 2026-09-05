import { describe, expect, it } from "vitest";
import { mensagemDeFalha } from "../mensagemDeFalha";

/**
 * A frase precisa pedir a ação certa.
 *
 * "Tente de novo em instantes" é verdadeira para falha passageira e mentira
 * para credencial revogada — nesse caso tentar de novo nunca funciona, e quem
 * lê fica repetindo uma ação impossível achando que é azar.
 */

/** Como o SDK da Anthropic entrega: um objeto com `status` e `message`. */
function falhaHttp(status: number) {
  return Object.assign(new Error(`${status} erro do provedor`), { status });
}

describe("mensagem de falha", () => {
  it.each([401, 403])("credencial recusada (%i) não manda tentar de novo", (status) => {
    const mensagem = mensagemDeFalha(falhaHttp(status));

    expect(mensagem).toContain("credencial");
    expect(mensagem).not.toContain("Tente de novo em instantes");
  });

  it("limite de uso manda esperar, que aí é o conselho certo", () => {
    expect(mensagemDeFalha(falhaHttp(429))).toContain("Aguarde");
  });

  it("falha desconhecida continua com a frase de sempre", () => {
    expect(mensagemDeFalha(falhaHttp(500))).toBe(
      "Não consegui responder agora. Tente de novo em instantes.",
    );
    expect(mensagemDeFalha(new Error("timeout"))).toContain("Tente de novo em instantes");
  });

  it("erro sem forma nenhuma não derruba a escolha da frase", () => {
    expect(mensagemDeFalha(null)).toContain("Tente de novo");
    expect(mensagemDeFalha("texto solto")).toContain("Tente de novo");
    expect(mensagemDeFalha({ status: "401" })).toContain("Tente de novo");
  });

  // O log leva o detalhe técnico; a conversa, não. Nome de variável de
  // ambiente e mensagem do SDK não são informação de quem está conversando.
  it("nenhuma frase vaza detalhe técnico", () => {
    const frases = [401, 403, 429, 500].map((s) => mensagemDeFalha(falhaHttp(s)));

    for (const frase of frases) {
      expect(frase).not.toContain("ANTHROPIC");
      expect(frase).not.toContain("api_key");
      expect(frase).not.toContain("erro do provedor");
      expect(frase).not.toMatch(/\b40[13]\b|\b429\b|\b500\b/);
    }
  });
});
