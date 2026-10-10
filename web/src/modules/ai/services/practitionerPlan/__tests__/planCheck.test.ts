import { describe, expect, it } from "vitest";
import { checkPlan, type PlanCheckContext, type PractitionerPlanProposal } from "../planCheck";

const ARROZ = { name: "Arroz branco cozido", serving_size: 100, calories: 130 };
const FRANGO = { name: "Frango (peito grelhado)", serving_size: 100, calories: 160 };

const CONTEXTO: PlanCheckContext = {
  trainingDays: 3,
  sessionMinutes: 45,
  sports: ["Corrida"],
  mealsPerDay: 2,
  targetCalories: 1000,
  allowedFoods: new Map([ARROZ, FRANGO].map((food) => [food.name, food])),
  allowedExercises: new Set(["Agachamento livre", "Supino reto", "Remada curvada"]),
};

const treino = (title: string, optional = false) => ({
  title,
  day_of_week: "monday" as const,
  optional,
  exercises: [{ exercise_name: "Agachamento livre", sets: 3, reps: "8-12", rest_seconds: 90 }],
});

/** 2 refeições somando 1.000 kcal: 300 g de arroz (390) + 381 g de frango (~610). */
const PLANO: PractitionerPlanProposal = {
  workouts: [treino("A"), treino("B"), treino("C"), treino("Corrida leve", true)],
  meals: [
    { name: "Almoço", meal_time: "12:00", items: [{ food_name: ARROZ.name, quantity: 300 }] },
    { name: "Jantar", meal_time: "19:00", items: [{ food_name: FRANGO.name, quantity: 381 }] },
  ],
  explanation: "Plano de exemplo.",
};

describe("checkPlan — o plano gerado respeita as escolhas", () => {
  it("aceita o plano que respeita tudo", () => {
    expect(checkPlan(PLANO, CONTEXTO)).toEqual([]);
  });

  it("recusa número de treinos diferente dos dias escolhidos", () => {
    const plano = { ...PLANO, workouts: [treino("A"), treino("B")] };
    expect(checkPlan(plano, CONTEXTO)).toContainEqual(
      expect.stringMatching(/2 treinos.*esperado 3/),
    );
  });

  it("o esporte entra só como sessão opcional, e só se a pessoa pratica", () => {
    const semEsporte = { ...CONTEXTO, sports: [] };
    expect(checkPlan(PLANO, semEsporte)).toContainEqual(expect.stringMatching(/opcional/));
  });

  it("recusa o plano em que o esporte que a pessoa pratica sumiu", () => {
    const plano = { ...PLANO, workouts: [treino("A"), treino("B"), treino("C")] };
    expect(checkPlan(plano, CONTEXTO)).toContainEqual(
      expect.stringMatching(/0 sessão.*esperado 1, uma por esporte/),
    );
  });

  it("recusa exercício fora do catálogo filtrado", () => {
    const plano = {
      ...PLANO,
      workouts: [
        {
          ...treino("A"),
          exercises: [{ exercise_name: "Leg press", sets: 3, reps: "10", rest_seconds: 60 }],
        },
        treino("B"),
        treino("C"),
      ],
    };
    expect(checkPlan(plano, CONTEXTO)).toContainEqual(expect.stringMatching(/"Leg press"/));
  });

  it("recusa número de refeições diferente do escolhido", () => {
    const plano = { ...PLANO, meals: PLANO.meals?.slice(0, 1) ?? null };
    expect(checkPlan(plano, CONTEXTO)).toContainEqual(
      expect.stringMatching(/1 refeições.*esperado 2/),
    );
  });

  /** TRAVA — o que a pessoa disse que não come não aparece (#365). */
  it("recusa alimento fora da lista permitida, que é onde caem os excluídos", () => {
    const plano = {
      ...PLANO,
      meals: [
        {
          name: "Almoço",
          meal_time: "12:00",
          items: [{ food_name: "Leite integral", quantity: 200 }],
        },
        PLANO.meals?.[1] ?? { name: "", meal_time: "", items: [] },
      ],
    };
    const erros = checkPlan(plano, CONTEXTO);
    if (!erros.some((erro) => erro.includes("Leite integral"))) {
      throw new Error(
        `ALIMENTO EXCLUÍDO NO PLANO: "Leite integral" passou pela conferência — ${erros}`,
      );
    }
  });

  it("recusa calorias longe da meta fixada pelo código", () => {
    const plano = {
      ...PLANO,
      meals: [
        { name: "Almoço", meal_time: "12:00", items: [{ food_name: ARROZ.name, quantity: 100 }] },
        { name: "Jantar", meal_time: "19:00", items: [{ food_name: FRANGO.name, quantity: 100 }] },
      ],
    };
    expect(checkPlan(plano, CONTEXTO)).toContainEqual(
      expect.stringMatching(/290 kcal.*meta de 1000/),
    );
  });

  it("sem dieta pela triagem, o plano não pode trazer refeição", () => {
    const semDieta = { ...CONTEXTO, targetCalories: null };
    expect(checkPlan(PLANO, semDieta)).toContainEqual(expect.stringMatching(/sem dieta/));
    expect(checkPlan({ ...PLANO, meals: null }, semDieta)).toEqual([]);
  });
});
