import { describe, expect, it } from "vitest";
import { calculateDietStrategy, DIET_STRATEGIES, strategyMealRows } from "../dietStrategies";

describe("calculateDietStrategy", () => {
  it("monta a semana inteira, de domingo (0) a sábado (6)", () => {
    const result = calculateDietStrategy("standard", 2000);

    expect(result.weeklySchedule.map((day) => day.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  // 30/40/30 da energia: proteína e carbo valem 4 kcal/g, gordura 9 kcal/g.
  it("converte a divisão da padrão em gramas", () => {
    const monday = calculateDietStrategy("standard", 2000).weeklySchedule[1];

    expect(monday.macros).toEqual({ calories: 2000, protein: 150, carbs: 200, fat: 67 });
  });

  it("no ciclo de carbo, sobe a energia em seg/qua/sex, desce em ter/qui/sáb e mantém no domingo", () => {
    const week = calculateDietStrategy("carb_cycling", 2000).weeklySchedule;

    expect(week.map((day) => day.macros.calories)).toEqual([
      2000, 2300, 1700, 2300, 1700, 2300, 1700,
    ]);
    expect(week[1].label).toBe("Alto Carboidrato");
    expect(week[2].label).toBe("Baixo Carboidrato");
  });

  it("no jejum intermitente, a primeira refeição é o quebra-jejum do meio-dia", () => {
    const [firstMeal] = calculateDietStrategy("intermittent_fasting", 2000).weeklySchedule[0].meals;

    expect(firstMeal).toMatchObject({ time: "12:00", type: "lunch" });
  });

  it("a personalizada não sugere refeição nenhuma", () => {
    const week = calculateDietStrategy("manual", 2000).weeklySchedule;

    expect(week.every((day) => day.meals.length === 0)).toBe(true);
  });

  it("a média da semana é a média dos sete dias", () => {
    const { averageMacros } = calculateDietStrategy("carb_cycling", 2000);

    expect(averageMacros.calories).toBe(Math.round((2000 + 2300 * 3 + 1700 * 3) / 7));
  });

  it("devolve a descrição da estratégia", () => {
    expect(calculateDietStrategy("ketogenic", 2000).description).toBe(
      DIET_STRATEGIES.ketogenic.description,
    );
  });
});

describe("DIET_STRATEGIES", () => {
  // O tipo de plano sai da estratégia nas duas plataformas: se web e mobile
  // decidirem cada um o seu, a mesma escolha grava planos de formatos diferentes.
  it("só o ciclo de carbo gera plano cíclico", () => {
    const cyclic = Object.entries(DIET_STRATEGIES)
      .filter(([, strategy]) => strategy.planType === "cyclic")
      .map(([key]) => key);

    expect(cyclic).toEqual(["carb_cycling"]);
  });
});

describe("strategyMealRows", () => {
  // Regressão da #337: o mobile gravava as refeições dos 7 dias numa dieta
  // única, e como `mealsOfDay` devolve todas as refeições de uma dieta única em
  // qualquer dia, o plano abria com cada refeição repetida sete vezes.
  it("dieta única grava um conjunto só, com day_of_week nulo", () => {
    const rows = strategyMealRows(calculateDietStrategy("standard", 2000), "unique");

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.day_of_week === null)).toBe(true);
  });

  it("dieta cíclica grava as refeições de cada dia, com o dia da semana", () => {
    const rows = strategyMealRows(calculateDietStrategy("carb_cycling", 2000), "cyclic");

    expect(rows).toHaveLength(28);
    expect(new Set(rows.map((row) => row.day_of_week))).toEqual(new Set([0, 1, 2, 3, 4, 5, 6]));
  });

  it("numera as refeições do dia na ordem do molde, com horário e tipo", () => {
    const rows = strategyMealRows(calculateDietStrategy("standard", 2000), "unique");

    expect(rows.map((row) => row.meal_order)).toEqual([0, 1, 2, 3]);
    expect(rows[0]).toEqual({
      name: "Café da Manhã",
      meal_type: "breakfast",
      meal_time: "08:00",
      meal_order: 0,
      day_of_week: null,
    });
  });

  it("a personalizada não gera linha nenhuma", () => {
    expect(strategyMealRows(calculateDietStrategy("manual", 2000), "unique")).toEqual([]);
  });
});

describe("strategyMealRows com o número de refeições da preferência", () => {
  const names = (rows: { name: string }[]) => rows.map((row) => row.name);

  it("com menos refeições, tira primeiro o lanche e mantém as principais", () => {
    const rows = strategyMealRows(calculateDietStrategy("standard", 2000), "unique", 3);

    expect(names(rows)).toEqual(["Café da Manhã", "Almoço", "Jantar"]);
  });

  it("com mais refeições, completa com lanche da manhã e ceia, em ordem de horário", () => {
    const rows = strategyMealRows(calculateDietStrategy("standard", 2000), "unique", 6);

    expect(rows.map((row) => row.meal_time)).toEqual([
      "08:00",
      "10:30",
      "13:00",
      "16:00",
      "20:00",
      "22:00",
    ]);
    expect(rows.map((row) => row.meal_order)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  // No jejum, completar com lanche das 10:30 quebraria a janela de 8h.
  it("no jejum intermitente, só completa com refeição dentro da janela", () => {
    const rows = strategyMealRows(calculateDietStrategy("intermittent_fasting", 2000), "unique", 8);

    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.meal_time >= "12:00" && row.meal_time <= "20:00")).toBe(true);
  });

  it("a personalizada continua sem refeição, qualquer que seja o número", () => {
    expect(strategyMealRows(calculateDietStrategy("manual", 2000), "unique", 5)).toEqual([]);
  });
});
