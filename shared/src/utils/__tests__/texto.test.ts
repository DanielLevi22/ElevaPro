import { describe, expect, it } from "vitest";
import { contagem, foldForSearch, withThousands } from "../texto";

describe("contagem", () => {
  // "1 treinos" saía na tela da fase: o plural era feito à mão em três lugares,
  // e num deles ninguém lembrou do singular.
  it("usa o singular só para um", () => {
    expect(contagem(1, "treino", "treinos")).toBe("1 treino");
    expect(contagem(0, "treino", "treinos")).toBe("0 treinos");
    expect(contagem(3, "fase", "fases")).toBe("3 fases");
  });
});

describe("foldForSearch", () => {
  it("tira acento e caixa, para 'supino' achar 'Supino Reto' e 'agachamento' achar 'Agachámento'", () => {
    expect(foldForSearch("  Agachámento LIVRE ")).toBe("agachamento livre");
  });
});

describe("withThousands", () => {
  it("separa o milhar com ponto, como o kit escreve 2.180 kcal", () => {
    expect(withThousands(2180)).toBe("2.180");
    expect(withThousands(1234567)).toBe("1.234.567");
    expect(withThousands(950)).toBe("950");
  });
});
