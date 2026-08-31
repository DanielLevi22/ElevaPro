import { describe, expect, it } from "vitest";
import { responderEmUmTurno } from "../turnoUnico";
import type { AIProvider, ContentBlock, ProviderStreamEvent } from "../types";

/**
 * Um provider falso é o seam que torna a migração verificável: a rota pode ser
 * conferida sem chamar a Anthropic, que é exatamente o que não dava para fazer
 * enquanto o SDK vivia embutido dentro dela.
 */
function providerQueResponde(
  fullContent: ContentBlock[],
  stopReason = "end_turn",
  deltas: string[] = [],
): AIProvider {
  return {
    async *stream(): AsyncGenerator<ProviderStreamEvent> {
      for (const content of deltas) yield { type: "text_delta", content };
      yield { type: "turn_end", fullContent, stopReason };
    },
  };
}

const pedido = { systemBlocks: [{ text: "seja breve" }], messages: [], tools: [] };

describe("a resposta de um turno só", () => {
  it("devolve o texto do turno", async () => {
    const provider = providerQueResponde([{ type: "text", text: '{"ok":true}' }]);

    expect(await responderEmUmTurno(provider, pedido)).toEqual({
      texto: '{"ok":true}',
      stopReason: "end_turn",
    });
  });

  // Os `text_delta` são os mesmos pedaços que o `fullContent` traz no fim.
  // Somando os dois, a resposta sairia duplicada — e um JSON duplicado não
  // falha no parse com erro claro: falha em "resposta inválida".
  it("não soma os deltas ao conteúdo final", async () => {
    const provider = providerQueResponde([{ type: "text", text: "abc" }], "end_turn", [
      "a",
      "b",
      "c",
    ]);

    expect((await responderEmUmTurno(provider, pedido)).texto).toBe("abc");
  });

  it("junta os blocos de texto na ordem em que vieram", async () => {
    const provider = providerQueResponde([
      { type: "text", text: "primeiro " },
      { type: "text", text: "segundo" },
    ]);

    expect((await responderEmUmTurno(provider, pedido)).texto).toBe("primeiro segundo");
  });

  // Truncada não é inválida: uma diz "peça de novo", a outra diz "o modelo
  // errou". Somadas no mesmo código, ninguém sabe qual foi.
  it("preserva o motivo de parada, para truncada não virar inválida", async () => {
    const provider = providerQueResponde([{ type: "text", text: "{" }], "max_tokens");

    expect((await responderEmUmTurno(provider, pedido)).stopReason).toBe("max_tokens");
  });

  it("ignora bloco que não é texto", async () => {
    const provider = providerQueResponde([
      { type: "tool_use", id: "1", name: "f", input: {} },
      { type: "text", text: "só isto" },
    ]);

    expect((await responderEmUmTurno(provider, pedido)).texto).toBe("só isto");
  });

  it("devolve texto vazio quando o turno não trouxe nenhum", async () => {
    const provider = providerQueResponde([]);

    expect((await responderEmUmTurno(provider, pedido)).texto).toBe("");
  });
});
