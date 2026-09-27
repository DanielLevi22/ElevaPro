import { describe, expect, it } from "vitest";
import { suggestDietGoal } from "../dietGoalSuggestion";

const BODY = { weightKg: 80, heightCm: 180, age: 30, sex: "M" as const };

describe("suggestDietGoal", () => {
  it("sem peso, altura, idade ou sexo, não sugere nada — não inventa corpo", () => {
    expect(suggestDietGoal({ ...BODY, weightKg: undefined })).toBeNull();
    expect(suggestDietGoal({ ...BODY, sex: undefined })).toBeNull();
  });

  it("calcula TMB, GET e a meta do objetivo", () => {
    const goal = suggestDietGoal({ ...BODY, trainingDaysPerWeek: 4, mainGoal: "Emagrecimento" });

    expect(goal).toMatchObject({ tmb: 1780, tdee: 2759, goal: "cutting", targetCalories: 2207 });
    expect(goal?.deltaKcal).toBe(2207 - 2759);
  });

  it("hipertrofia vira superávit, e objetivo sem dieta própria vira manutenção", () => {
    expect(suggestDietGoal({ ...BODY, mainGoal: "Hipertrofia" })?.goal).toBe("bulking");
    expect(suggestDietGoal({ ...BODY, mainGoal: "Saúde / Bem-estar" })?.goal).toBe("maintenance");
    expect(suggestDietGoal(BODY)?.goal).toBe("maintenance");
  });

  // Treinar pouco e trabalhar carregando peso gasta mais que treinar pouco sentado.
  it("o trabalho pesado sobe um nível de atividade", () => {
    const seated = suggestDietGoal({ ...BODY, trainingDaysPerWeek: 2 });
    const heavy = suggestDietGoal({ ...BODY, trainingDaysPerWeek: 2, routine: "Pesado" });

    expect(heavy?.tdee).toBeGreaterThan(seated?.tdee ?? 0);
  });

  it("devolve os macros da meta, em gramas", () => {
    const goal = suggestDietGoal({ ...BODY, mainGoal: "Emagrecimento" });

    expect(goal?.macros).toMatchObject({ protein: 176, fat: 64 });
  });
});
