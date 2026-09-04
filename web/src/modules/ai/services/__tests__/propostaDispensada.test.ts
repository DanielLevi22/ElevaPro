import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispensar, foiDispensada } from "../propostaDispensada";

/**
 * "Fechar" tem que fechar.
 *
 * A proposta aprovada volta para a tela toda vez que a conversa abre — é o que
 * a mensagem "aprovados e salvos: A, B, C" promete mostrar. Quem já viu e
 * mandou sair não pode ver de novo, senão o botão mentiu.
 *
 * E storage é opcional: em janela anônima ou com dados de site bloqueados, o
 * acessador levanta exceção. Sem ele o comportamento volta a ser o de antes —
 * a proposta aparece —, nunca uma tela quebrada.
 */

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("proposta dispensada", () => {
  it("não conhece conversa nenhuma antes de alguém fechar", () => {
    expect(foiDispensada("sessao-1")).toBe(false);
  });

  it("lembra a conversa que foi fechada", () => {
    dispensar("sessao-1");

    expect(foiDispensada("sessao-1")).toBe(true);
  });

  it("lembra por conversa, não para todas de uma vez", () => {
    dispensar("sessao-1");

    expect(foiDispensada("sessao-2")).toBe(false);
  });

  it("fechar duas vezes não duplica o registro", () => {
    dispensar("sessao-1");
    dispensar("sessao-1");

    expect(JSON.parse(localStorage.getItem("elevapro:propostas-dispensadas") ?? "[]")).toEqual([
      "sessao-1",
    ]);
  });

  it("conteúdo corrompido no storage não derruba a leitura", () => {
    localStorage.setItem("elevapro:propostas-dispensadas", "{isto não é json");

    expect(foiDispensada("sessao-1")).toBe(false);
  });

  // Janela anônima e dados de site bloqueados fazem o próprio acessador lançar.
  it("storage indisponível deixa a proposta aparecer, sem quebrar", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("acesso negado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("acesso negado");
    });

    expect(() => dispensar("sessao-1")).not.toThrow();
    expect(foiDispensada("sessao-1")).toBe(false);
  });
});
