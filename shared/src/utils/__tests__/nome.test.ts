import { describe, expect, it } from "vitest";
import { nomeCurto, primeiroNome } from "../nome";

describe("nomeCurto", () => {
  it("primeiro nome e inicial do último, como o kit escreve", () => {
    expect(nomeCurto("Daniel Levi Souza")).toBe("Daniel S.");
  });

  it("nome único fica inteiro", () => {
    expect(nomeCurto("Ana")).toBe("Ana");
  });

  it("ignora espaço sobrando", () => {
    expect(nomeCurto("  maria   clara  ")).toBe("maria c.");
  });

  it("sem nome, não inventa um", () => {
    expect(nomeCurto(null)).toBeNull();
    expect(nomeCurto("   ")).toBeNull();
  });
});

describe("primeiroNome", () => {
  // O cadastro guarda o nome como a pessoa digitou, e parte dos alunos digitou
  // em maiúsculas: "Oi, DANIEL!" soa como grito na saudação do assistente.
  it("devolve o primeiro nome com só a inicial maiúscula", () => {
    expect(primeiroNome("DANIEL LEVI")).toBe("Daniel");
    expect(primeiroNome("maria clara")).toBe("Maria");
  });

  it("ignora espaço sobrando", () => {
    expect(primeiroNome("  Ana   Souza ")).toBe("Ana");
  });

  it("sem nome, devolve null para quem chama escolher o que dizer", () => {
    expect(primeiroNome("")).toBeNull();
    expect(primeiroNome(null)).toBeNull();
  });
});
