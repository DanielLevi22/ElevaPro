import { describe, expect, it } from "vitest";
import { nomeCurto } from "../nome";

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
