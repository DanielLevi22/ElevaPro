import { describe, expect, it } from "vitest";
import { readTrainingPlace, TRAINING_PLACES, trainsAtGym } from "../trainingPlace";

describe("o lugar de treino", () => {
  it("lê a resposta gravada, e recusa o que não é lugar", () => {
    expect(readTrainingPlace("Home gym")).toBe(TRAINING_PLACES.home);
    expect(readTrainingPlace("Academia")).toBeNull();
    expect(readTrainingPlace(undefined)).toBeNull();
  });

  /**
   * A troca de exercício e a montagem do plano escolhem pelo lugar. Comparar só
   * com "Academia completa" mandava quem respondeu "Academia básica" na
   * anamnese antiga para os exercícios de casa.
   */
  it("academia básica também é academia; casa e ar livre não", () => {
    expect(trainsAtGym(TRAINING_PLACES.fullGym)).toBe(true);
    if (!trainsAtGym(TRAINING_PLACES.basicGym)) {
      throw new Error("ACADEMIA VIROU CASA: quem treina na academia básica perdeu os aparelhos");
    }
    expect(trainsAtGym(TRAINING_PLACES.home)).toBe(false);
    expect(trainsAtGym(TRAINING_PLACES.outdoor)).toBe(false);
  });
});
