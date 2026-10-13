import { describe, expect, it } from "vitest";
import { resolveName } from "../repairNames";

const EXERCICIOS = [
  "Desenvolvimento com barra",
  "Desenvolvimento com halteres sentado",
  "Agachamento livre",
];
const ALIMENTOS = ["Alface", "Arroz branco cozido", "Frango (peito grelhado)"];

describe("resolveName — o nome da IA vira o nome da lista, quando só há um", () => {
  it("ignora caixa e acento", () => {
    expect(resolveName("agachamento LIVRE", EXERCICIOS)).toBe("Agachamento livre");
  });

  it("completa o nome encurtado quando só um da lista começa assim", () => {
    expect(resolveName("Desenvolvimento com halteres", EXERCICIOS)).toBe(
      "Desenvolvimento com halteres sentado",
    );
  });

  it("acha o alimento dentro do nome enfeitado", () => {
    expect(resolveName("Salada de alface", ALIMENTOS)).toBe("Alface");
  });

  it("ambíguo continua como veio, para a conferência recusar", () => {
    expect(resolveName("Desenvolvimento", EXERCICIOS)).toBe("Desenvolvimento");
  });

  /** TRAVA — o reparo só aponta para nomes permitidos: o excluído nunca entra por aqui. */
  it("alimento fora da lista continua fora", () => {
    expect(resolveName("Iogurte natural desnatado", ALIMENTOS)).toBe("Iogurte natural desnatado");
  });
});
