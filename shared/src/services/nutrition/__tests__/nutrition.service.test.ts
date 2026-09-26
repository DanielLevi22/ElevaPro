import { describe, expect, it } from "vitest";
import type { DietMeal, DietMealItem } from "../../../types/nutrition.types";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createNutritionService } from "../nutrition.service";

describe("nutritionService — planos de dieta", () => {
  // A busca traz todos os planos do especialista de uma vez e o recorte por
  // aluno é feito por quem chama. O embed nomeia a constraint de propósito:
  // `diet_plans` tem duas FKs para `profiles` (student_id e specialist_id), e
  // sem o nome o PostgREST não sabe qual seguir.
  it("busca planos pelo especialista, com o aluno embutido pela FK nomeada", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createNutritionService(supabase).fetchDietPlans("esp-1");

    expect(chamadas[0].tabela).toBe("diet_plans");
    expect(chamadas[0].filtros).toEqual({ specialist_id: "esp-1" });
    expect(chamadas[0].select).toContain("diet_plans_student_id_profiles_id_fk");
  });

  it("devolve lista vazia sem planos, sem quebrar", async () => {
    const { supabase } = criarSupabaseFake({ data: null });
    expect(await createNutritionService(supabase).fetchDietPlans("esp-1")).toEqual([]);
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42703" } });
    await expect(createNutritionService(supabase).fetchDietPlans("esp-1")).rejects.toEqual({
      message: "42703",
    });
  });
});

describe("nutritionService — limpar e colar dia", () => {
  // A ordem importa: `meal_logs` e `diet_meal_items` apontam para `diet_meals`.
  // Apagar a refeição primeiro esbarraria na chave estrangeira.
  it("apaga registros e itens antes das próprias refeições", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: [{ id: "m1" }, { id: "m2" }] },
      {},
      {},
      {},
    ]);

    await createNutritionService(supabase).clearDietDay("p1", 1);

    expect(chamadas.map((c) => c.tabela)).toEqual([
      "diet_meals",
      "meal_logs",
      "diet_meal_items",
      "diet_meals",
    ]);
    expect(chamadas[1].filtros).toEqual({ diet_meal_id: ["m1", "m2"] });
  });

  // Sem a saída antecipada, o `.in()` receberia lista vazia — e uma condição
  // vazia não filtra nada.
  it("não apaga nada quando o dia já está vazio", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createNutritionService(supabase).clearDietDay("p1", 1);
    expect(chamadas).toHaveLength(1);
  });

  // Colar substitui: sem limpar antes, as refeições se acumulariam no dia.
  it("limpa o dia de destino antes de colar", async () => {
    const meals = [
      { name: "Almoço", meal_type: "lunch", meal_order: 0, diet_meal_items: [] },
    ] as unknown as (DietMeal & { diet_meal_items?: DietMealItem[] })[];

    const { supabase, chamadas } = criarSupabaseFake([
      { data: [{ id: "m-antiga" }] },
      {},
      {},
      {},
      { data: { id: "m-nova" } },
    ]);

    await createNutritionService(supabase).pasteDietDay("p1", 3, meals);

    expect(chamadas[0].filtros).toEqual({ diet_plan_id: "p1", day_of_week: 3 });
    expect(chamadas.slice(1, 4).map((c) => c.tabela)).toEqual([
      "meal_logs",
      "diet_meal_items",
      "diet_meals",
    ]);
    expect((chamadas[4].payload as Record<string, unknown>).day_of_week).toBe(3);
  });
});

describe("nutritionService — registro de refeição", () => {
  // O toggle é chamado a cada clique. Sem procurar o registro existente, cada
  // clique criaria uma linha e a aderência contaria a mesma refeição N vezes.
  it("atualiza o registro existente em vez de criar outro", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "log-1" } },
      { data: { id: "log-1", completed: true } },
    ]);

    await createNutritionService(supabase).toggleMealLog({
      student_id: "aluno-1",
      diet_plan_id: "p1",
      diet_meal_id: "m1",
      logged_date: "2026-08-28",
      completed: true,
    });

    expect(chamadas[1].payload).toEqual({ completed: true });
    expect(chamadas[1].filtros).toEqual({ id: "log-1" });
    expect(chamadas[1].metodos.some((m) => m.nome === "insert")).toBe(false);
  });

  it("cria o registro na primeira vez", async () => {
    const { supabase, chamadas } = criarSupabaseFake([{ data: null }, { data: { id: "log-1" } }]);

    await createNutritionService(supabase).toggleMealLog({
      student_id: "aluno-1",
      diet_plan_id: "p1",
      diet_meal_id: "m1",
      logged_date: "2026-08-28",
      completed: true,
    });

    expect(chamadas[1].payload).toEqual({
      student_id: "aluno-1",
      diet_plan_id: "p1",
      diet_meal_id: "m1",
      logged_date: "2026-08-28",
      completed: true,
    });
  });

  // Regressão do DT-24: `meal_logs` é tabela sensível pela LGPD_COMPLIANCE.md.
  it("não pede tudo de meal_logs", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createNutritionService(supabase).fetchMealLogs("aluno-1", "p1");

    for (const c of chamadas.filter((x) => x.tabela === "meal_logs")) {
      expect(c.select).not.toBe("*");
    }
  });
});

describe("nutritionService — alimentos da mesma categoria", () => {
  // A troca do aluno procura equivalentes entre os alimentos do mesmo grupo:
  // frango por peixe, arroz por batata. Buscar o catálogo inteiro trazia azeite
  // como candidato a substituir frango.
  it("filtra pela categoria e limita a quantidade", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });
    await createNutritionService(supabase).fetchFoodsByCategory("proteina", 40);

    expect(chamadas[0].tabela).toBe("foods");
    expect(chamadas[0].filtros).toEqual({ category: "proteina" });
    expect(chamadas[0].select).not.toBe("*");
    expect(chamadas[0].metodos).toContainEqual({ nome: "limit", args: [40] });
  });

  it("propaga erro em vez de devolver lista vazia", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createNutritionService(supabase).fetchFoodsByCategory("proteina")).rejects.toEqual(
      { message: "42501" },
    );
  });
});
