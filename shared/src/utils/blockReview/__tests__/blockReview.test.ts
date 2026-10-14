import { describe, expect, it } from "vitest";
import type { OnboardingPlanPending } from "../../../types/onboardingPlan.types";
import { answersWithChanges, compareBlocks, readBlockChanges } from "..";

describe("as mudanças da reavaliação (B2)", () => {
  it("sem mudança nenhuma, o bloco novo sai das respostas de antes", () => {
    expect(readBlockChanges(undefined)).toEqual({});
    expect(readBlockChanges({})).toEqual({});
  });

  it("aceita só os valores que a tela oferece", () => {
    expect(
      readBlockChanges({ main_goal: "Hipertrofia", training_days: 4, gym_type: "Home gym" }),
    ).toEqual({ main_goal: "Hipertrofia", training_days: 4, gym_type: "Home gym" });
  });

  // A anamnese é dado de saúde (Art. 11): o que vier fora da lista não entra,
  // nem pela metade — texto livre aqui seria anotação sem base legal própria.
  it("um valor fora da lista recusa o pedido inteiro", () => {
    expect(readBlockChanges({ training_days: 4, injuries: ["dói tudo"] })).toBeNull();
    expect(readBlockChanges({ training_days: 9 })).toBeNull();
    expect(readBlockChanges({ main_goal: "Ficar monstro" })).toBeNull();
    expect(readBlockChanges([])).toBeNull();
  });

  it("a lesão é gravada como o onboarding grava: se há, e onde", () => {
    expect(answersWithChanges({ main_goal: "Emagrecimento" }, { injuries: ["Joelhos"] })).toEqual({
      main_goal: "Emagrecimento",
      injury_reported: true,
      injuries: ["Joelhos"],
    });
    expect(answersWithChanges({ injuries: ["Joelhos"] }, { injuries: [] })).toMatchObject({
      injury_reported: false,
      injuries: [],
    });
  });
});

describe("o que muda no próximo bloco (B5)", () => {
  const workout = (title: string, names: string[], optional = false) => ({
    title,
    day_of_week: "monday" as const,
    optional,
    exercises: names.map((exercise_name) => ({
      exercise_name,
      sets: 3,
      reps: "10",
      rest_seconds: 60,
    })),
  });
  const next = {
    proposal: {
      workouts: [
        workout("A", ["Supino reto", "Leg press"]),
        workout("B", ["Puxada frontal"]),
        workout("Corrida", [], true),
      ],
      meals: null,
      explanation: "",
    },
    target: { calories: 1950, protein: 0, carbs: 0, fat: 0, guards: [] },
    trainingDays: 2,
  } as unknown as OnboardingPlanPending;

  it("compara os dias escolhidos, os exercícios novos e a meta", () => {
    expect(
      compareBlocks(
        { trainingDays: 3, exerciseNames: ["supino reto", "Remada"], calories: 2000 },
        next,
      ),
    ).toEqual({
      trainingDays: { before: 3, after: 2 },
      newExercises: ["Leg press", "Puxada frontal"],
      keptExercises: 1,
      calories: { before: 2000, after: 1950 },
    });
  });
});
