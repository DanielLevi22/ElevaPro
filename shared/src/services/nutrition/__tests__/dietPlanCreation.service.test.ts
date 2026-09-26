import { describe, expect, it } from "vitest";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createNutritionService } from "../nutrition.service";

const plan = {
  student_id: "aluno-1",
  specialist_id: "esp-1",
  name: "Cutting",
  start_date: "2026-10-01",
  end_date: "2026-11-01",
  target_calories: 2000,
  target_protein: 150,
  target_carbs: 200,
  target_fat: 67,
};

// Respostas na ordem das chamadas de `createDietPlan` (busca do plano ativo,
// inserção do plano) seguidas da inserção das refeições.
const respostasDaCriacao = [{ data: null }, { data: { id: "plano-novo" } }, { data: [] }];

describe("nutritionService — criar plano pela estratégia", () => {
  it("grava as metas do formulário e o tipo de plano que sai da estratégia", async () => {
    const { supabase, chamadas } = criarSupabaseFake(respostasDaCriacao);

    await createNutritionService(supabase).createDietPlanFromStrategy(plan, "carb_cycling");

    const insercaoDoPlano = chamadas.find((c) => c.tabela === "diet_plans" && c.payload);
    expect(insercaoDoPlano?.payload).toMatchObject({
      plan_type: "cyclic",
      target_calories: 2000,
      target_protein: 150,
      student_id: "aluno-1",
    });
  });

  // Regressão da #337: o mobile criava as refeições dos 7 dias numa dieta única.
  it("dieta única grava um conjunto de refeições, com day_of_week nulo, numa inserção só", async () => {
    const { supabase, chamadas } = criarSupabaseFake(respostasDaCriacao);

    await createNutritionService(supabase).createDietPlanFromStrategy(plan, "standard");

    const insercoes = chamadas.filter((c) => c.tabela === "diet_meals");
    expect(insercoes).toHaveLength(1);
    const refeicoes = insercoes[0].payload as {
      day_of_week: number | null;
      diet_plan_id: string;
    }[];
    expect(refeicoes).toHaveLength(4);
    expect(refeicoes.every((r) => r.day_of_week === null && r.diet_plan_id === "plano-novo")).toBe(
      true,
    );
  });

  it("a personalizada cria o plano sem tocar em diet_meals", async () => {
    const { supabase, chamadas } = criarSupabaseFake(respostasDaCriacao);

    const created = await createNutritionService(supabase).createDietPlanFromStrategy(
      plan,
      "manual",
    );

    expect(created.id).toBe("plano-novo");
    expect(chamadas.some((c) => c.tabela === "diet_meals")).toBe(false);
  });

  it("propaga o erro da inserção das refeições", async () => {
    const { supabase } = criarSupabaseFake([
      { data: null },
      { data: { id: "plano-novo" } },
      { error: { message: "42501" } },
    ]);

    await expect(
      createNutritionService(supabase).createDietPlanFromStrategy(plan, "standard"),
    ).rejects.toEqual({ message: "42501" });
  });
});
