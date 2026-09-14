import { describe, expect, it } from "vitest";
import { textoDaDificuldade, textoDasPorcoes } from "../preparo";

describe("preparo da refeição", () => {
  // O aluno lê no app e o especialista confere no web: o mesmo texto nos dois,
  // ou "Media" num e "Média" no outro.
  it("dificuldade com acento, como a tela mostra", () => {
    expect(textoDaDificuldade("facil")).toBe("Fácil");
    expect(textoDaDificuldade("media")).toBe("Média");
    expect(textoDaDificuldade("dificil")).toBe("Difícil");
  });

  it("uma porção no singular, mais de uma no plural", () => {
    expect(textoDasPorcoes(1)).toBe("1 porção");
    expect(textoDasPorcoes(4)).toBe("4 porções");
  });
});
