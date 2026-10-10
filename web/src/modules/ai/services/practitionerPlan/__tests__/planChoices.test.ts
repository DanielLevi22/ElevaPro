import { describe, expect, it } from "vitest";
import { allowedExerciseNames, readPlanChoices } from "../planChoices";

describe("readPlanChoices", () => {
  it("lê as respostas do onboarding", () => {
    const choices = readPlanChoices({
      training_days: 4,
      training_duration: 60,
      gym_type: "Home gym",
      home_equipment: ["Halteres"],
      sports: ["Corrida"],
      meals_per_day: 5,
      food_exclusions: ["Lactose"],
      diet_style: "Vegetariano",
    });
    expect(choices).toMatchObject({
      trainingDays: 4,
      sessionMinutes: 60,
      place: "Home gym",
      homeEquipment: ["Halteres"],
      sports: ["Corrida"],
      mealsPerDay: 5,
      foodExclusions: ["Lactose"],
      dietStyle: "Vegetariano",
    });
  });

  it("quem pulou O6 e O7 recebe os padrões, e não um plano vazio", () => {
    expect(readPlanChoices({})).toMatchObject({
      trainingDays: 3,
      sessionMinutes: 45,
      place: "Academia completa",
      sports: [],
      mealsPerDay: 4,
      foodExclusions: [],
      dietStyle: "Onívoro",
    });
  });

  it("valor fora do que o onboarding oferece cai no padrão", () => {
    expect(readPlanChoices({ training_days: 9, meals_per_day: "muitas" })).toMatchObject({
      trainingDays: 3,
      mealsPerDay: 4,
    });
  });
});

describe("allowedExerciseNames", () => {
  const CATALOGO = [
    { id: "supino", name: "Supino na máquina", venue: "academia", category: "forca" },
    { id: "flexao", name: "Flexão de braço", venue: "ambos", category: "forca" },
    { id: "agachamento", name: "Agachamento com halteres", venue: "casa", category: "forca" },
    { id: "esteira", name: "Esteira", venue: "academia", category: "cardio" },
  ];

  it("na academia, toda a força do catálogo", () => {
    expect(allowedExerciseNames(CATALOGO, "Academia completa")).toEqual([
      "Supino na máquina",
      "Flexão de braço",
      "Agachamento com halteres",
    ]);
  });

  it("em casa e ao ar livre, só o que não depende de academia", () => {
    for (const place of ["Home gym", "Ao ar livre"]) {
      expect(allowedExerciseNames(CATALOGO, place)).toEqual([
        "Flexão de braço",
        "Agachamento com halteres",
      ]);
    }
  });

  /**
   * TRAVA — "Recomendar menos" é preferência de treino guardada na anamnese
   * (#365, 6d). O exercício evitado sai da lista antes do prompt: a IA não
   * recebe a lista de evitados, só deixa de ver o exercício (Art. 6°, III).
   */
  it("o exercício que a pessoa pediu para ver menos não chega à IA", () => {
    const lista = allowedExerciseNames(CATALOGO, "Academia completa", ["flexao"]);
    if (lista.includes("Flexão de braço")) {
      throw new Error("RECOMENDAR MENOS IGNORADO: o exercício evitado foi oferecido à IA");
    }
    expect(lista).toEqual(["Supino na máquina", "Agachamento com halteres"]);
  });

  it("lê os evitados das respostas, e ignora o que não é texto", () => {
    expect(readPlanChoices({ avoided_exercises: ["flexao", 3] }).avoidedExercises).toEqual([
      "flexao",
    ]);
  });
});
