import { describe, expect, it } from "vitest";
import { doisDigitos } from "../calendario";

describe("doisDigitos", () => {
  it.each([
    [6, "06"],
    [12, "12"],
    [0, "00"],
  ])("escreve %i como %s", (numero, texto) => {
    expect(doisDigitos(numero)).toBe(texto);
  });
});
