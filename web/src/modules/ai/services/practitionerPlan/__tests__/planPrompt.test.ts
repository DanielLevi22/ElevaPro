import { describe, expect, it } from "vitest";
import { readPlanChoices } from "../planChoices";
import { buildPlanPrompt } from "../planPrompt";

const ENTRADA = {
  goal: "Emagrecimento",
  level: "beginner" as const,
  choices: readPlanChoices({ training_days: 3, meals_per_day: 4, sports: ["Corrida"] }),
  target: { calories: 1850, protein: 150, carbs: 190, fat: 55 },
  injuryReported: true,
  exercises: ["Agachamento livre", "Supino reto"],
  foods: [
    "Arroz branco cozido — 130 kcal por 100 g",
    "Frango (peito grelhado) — 160 kcal por 100 g",
  ],
};

describe("buildPlanPrompt", () => {
  it("leva a meta fixada pelo código e as escolhas, para a IA não decidir número", () => {
    const prompt = buildPlanPrompt(ENTRADA);
    expect(prompt).toContain("1850 kcal");
    expect(prompt).toContain("3 treinos");
    expect(prompt).toContain("4 refeições");
    expect(prompt).toContain("Corrida");
    expect(prompt).toContain("Agachamento livre");
    expect(prompt).toContain("Frango (peito grelhado)");
  });

  it("sem dieta, pede só o treino", () => {
    const prompt = buildPlanPrompt({ ...ENTRADA, target: null });
    expect(prompt).toMatch(/sem dieta/i);
    expect(prompt).not.toContain("kcal");
  });

  /**
   * TRAVA — o prompt leva só o necessário para escolher exercícios e alimentos
   * (Art. 6°, III; ADR-0044). Idade, peso, altura, sexo e a triagem ficam no
   * servidor: a meta já foi calculada com eles, e o modelo não precisa de mais.
   * A lesão vira uma regra de treino, sem dizer que existe uma lesão.
   */
  it("não leva dado do corpo, triagem nem a palavra lesão", () => {
    const prompt = buildPlanPrompt(ENTRADA).toLowerCase();
    // Palavra inteira: "quantidade" contém "idade" e não é a idade de ninguém.
    for (const proibido of [
      "idade",
      "anos",
      "peso corporal",
      "altura",
      "sexo",
      "triagem",
      "lesão",
      "diabetes",
      "gestação",
    ]) {
      if (new RegExp(String.raw`(^|[^\p{L}])${proibido}($|[^\p{L}])`, "u").test(prompt)) {
        throw new Error(`DADO DE SAÚDE NO PROMPT: "${proibido}" foi para a IA`);
      }
    }
  });

  it("o ajuste de O10 pede só as refeições, com a preferência, sem a lista de exercícios", () => {
    const prompt = buildPlanPrompt({
      ...ENTRADA,
      mealsOnly: true,
      dietInstruction: "Prefira alimentos mais baratos.",
    });
    expect(prompt).toContain("Prefira alimentos mais baratos.");
    expect(prompt).toContain('"workouts": []');
    expect(prompt).not.toContain("Agachamento livre");
  });

  it("em casa, leva o equipamento que a pessoa marcou", () => {
    const choices = readPlanChoices({
      gym_type: "Home gym",
      home_equipment: ["Halteres", "Kettlebell"],
    });
    expect(buildPlanPrompt({ ...ENTRADA, choices })).toContain(
      "Equipamento disponível: Halteres, Kettlebell",
    );
  });
});
