import { describe, expect, it } from "vitest";
import { knownPeriodizationObjective, workoutLetterOf, workoutSplitOf } from "../workouts.types";

describe("objetivo da periodização", () => {
  it("devolve o valor quando é um dos 6", () => {
    expect(knownPeriodizationObjective("weight_loss")).toBe("weight_loss");
  });

  it("devolve null para o texto livre antigo do mobile", () => {
    expect(knownPeriodizationObjective("Hipertrofia")).toBeNull();
    expect(knownPeriodizationObjective(null)).toBeNull();
  });
});

describe("divisão da fase", () => {
  it('tira o "Treino " antes da letra', () => {
    expect(workoutLetterOf("Treino D")).toBe("D");
    expect(workoutLetterOf("treino b")).toBe("B");
  });

  it("usa a primeira letra quando o título não segue o padrão", () => {
    expect(workoutLetterOf("Superior")).toBe("S");
  });

  it('dá "AB" para as fichas que a divisão cria, não "TT"', () => {
    expect(workoutSplitOf([{ title: "Treino A" }, { title: "Treino B" }])).toBe("AB");
    expect(workoutSplitOf([])).toBe("");
  });
});
