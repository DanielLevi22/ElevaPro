import { describe, expect, it } from "vitest";
import { contagem } from "../texto";

describe("contagem", () => {
  // "1 treinos" saía na tela da fase: o plural era feito à mão em três lugares,
  // e num deles ninguém lembrou do singular.
  it("usa o singular só para um", () => {
    expect(contagem(1, "treino", "treinos")).toBe("1 treino");
    expect(contagem(0, "treino", "treinos")).toBe("0 treinos");
    expect(contagem(3, "fase", "fases")).toBe("3 fases");
  });
});
