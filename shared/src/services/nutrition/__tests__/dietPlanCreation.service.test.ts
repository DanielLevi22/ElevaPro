import { afterEach, describe, expect, it, vi } from "vitest";
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

// Respostas na ordem: a inserção do plano, depois a das refeições.
const respostasDaCriacao = [{ data: { id: "plano-novo" } }, { data: [] }];

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
      { data: { id: "plano-novo" } },
      { error: { message: "42501" } },
    ]);

    await expect(
      createNutritionService(supabase).createDietPlanFromStrategy(plan, "standard"),
    ).rejects.toEqual({ message: "42501" });
  });
});

describe("nutritionService — plano nasce em rascunho", () => {
  // Criar não pode tirar a dieta que o aluno segue: o plano só vale, e só
  // finaliza o anterior, quando é enviado (#337).
  it("cria o plano em draft, sem tocar no plano ativo do aluno", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: { id: "plano-novo" } });

    await createNutritionService(supabase).createDietPlan(plan);

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].payload).toMatchObject({ status: "draft", student_id: "aluno-1" });
  });

  it("envia o rascunho pela função do banco, que finaliza o anterior na mesma transação", async () => {
    const { supabase, rpcs } = criarSupabaseFake({ data: { id: "plano-novo", status: "active" } });

    const sent = await createNutritionService(supabase).activateDietPlan("plano-novo");

    expect(rpcs).toEqual([{ nome: "activate_diet_plan", args: [{ p_plan_id: "plano-novo" }] }]);
    expect(sent.status).toBe("active");
  });

  it("propaga a recusa do envio", async () => {
    const { supabase } = criarSupabaseFake({ error: { message: "42501" } });

    await expect(createNutritionService(supabase).activateDietPlan("alheio")).rejects.toEqual({
      message: "42501",
    });
  });

  // O histórico é o que já valeu. Rascunho nunca valeu e não é histórico.
  it("o histórico traz só planos finalizados", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: [] });

    await createNutritionService(supabase).fetchDietPlanHistory("aluno-1");

    expect(chamadas[0].filtros).toEqual({ student_id: "aluno-1", status: "finished" });
  });
});

describe("nutritionService — clonar plano", () => {
  afterEach(() => vi.useRealTimers());

  it("recomeça a vigência hoje sem herdar o vencimento do plano antigo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 27, 23, 30));
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { plan_type: "unique", start_date: "2026-01-01", end_date: "2026-01-29" } },
      { data: { id: "novo" } },
      { data: [] },
    ]);

    await createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano");

    expect(chamadas[1].payload).toMatchObject({ start_date: "2026-09-27", end_date: "2026-10-25" });
  });

  it("recusa nome vazio antes de ler ou criar um plano", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ data: null });

    await expect(
      createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "  "),
    ).rejects.toThrow('Nome do plano inválido: "  ". Esperado texto não vazio.');
    expect(chamadas).toHaveLength(0);
  });

  const planoOrigem = {
    id: "p1",
    name: "Cutting",
    plan_type: "unique",
    end_date: "2026-12-31",
    target_calories: 2000,
    target_protein: 150,
    target_carbs: 200,
    target_fat: 60,
  };

  const refeicaoDeOrigem = {
    name: "Café",
    meal_type: "breakfast",
    meal_order: 0,
    day_of_week: 1,
    meal_time: "08:00",
    target_calories: 400,
    diet_meal_items: [
      { food_id: "f1", quantity: "100", unit: "g", order_index: 0 },
      { food_id: "f2", quantity: "50", unit: "g", order_index: 1 },
    ],
  };

  // Art. 6°, III: reaproveitar uma estrutura não autoriza transferir a
  // identificação, as notas nem as restrições de um aluno para outro.
  it("não transfere nome, notas ou restrições do aluno de origem", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      {
        data: {
          ...planoOrigem,
          name: "Plano da Ana",
          notes: "Observação da Ana",
          dietary_restrictions: ["lactose_free"],
        },
      },
      { data: { id: "novo" } },
      { data: [] },
    ]);

    await createNutritionService(supabase).cloneDietPlan(
      "p1",
      "aluno-2",
      "esp-1",
      "  Novo plano  ",
    );

    expect(
      chamadas[1].payload,
      "VAZAMENTO ENTRE ALUNOS: cópia herdou informações pessoais da origem",
    ).toMatchObject({
      name: "Novo plano",
      notes: null,
      dietary_restrictions: [],
    });
  });

  // O clone pertence ao aluno de destino e ao especialista que importou — não
  // aos da origem. Herdar o dono seria vazar plano entre alunos.
  it("cria um rascunho para o aluno de destino, do especialista que importou", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: planoOrigem },
      { data: { id: "novo" } },
      { data: [] },
    ]);

    await createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano");

    const criacao = chamadas[1].payload as Record<string, unknown>;
    expect(criacao).toMatchObject({
      student_id: "aluno-2",
      specialist_id: "esp-1",
      status: "draft",
      target_calories: 2000,
    });
  });

  it("não finaliza nenhum plano do aluno de destino", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: planoOrigem },
      { data: { id: "novo" } },
      { data: [] },
    ]);

    await createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano");

    expect(chamadas.some((c) => c.metodos.some((m) => m.nome === "update"))).toBe(false);
  });

  it("copia as refeições e os itens de cada uma", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: planoOrigem },
      { data: { id: "novo" } },
      { data: [refeicaoDeOrigem] },
      { data: { id: "refeicao-nova" } },
      {},
    ]);

    await createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano");

    const refeicao = chamadas[3].payload as Record<string, unknown>;
    expect(refeicao).toMatchObject({ diet_plan_id: "novo", name: "Café", day_of_week: 1 });
    expect(chamadas[4].payload).toEqual([
      { diet_meal_id: "refeicao-nova", food_id: "f1", quantity: "100", unit: "g", order_index: 0 },
      { diet_meal_id: "refeicao-nova", food_id: "f2", quantity: "50", unit: "g", order_index: 1 },
    ]);
  });

  it("não insere itens quando a refeição de origem não tem nenhum", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: planoOrigem },
      { data: { id: "novo" } },
      { data: [{ ...refeicaoDeOrigem, diet_meal_items: [] }] },
      { data: { id: "refeicao-nova" } },
    ]);

    await createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano");

    expect(chamadas.filter((c) => c.tabela === "diet_meal_items")).toHaveLength(0);
  });

  // Antes o erro da cópia dos itens era descartado: o clone saía com as
  // refeições vazias e ninguém sabia.
  it("propaga o erro da cópia dos itens", async () => {
    const { supabase } = criarSupabaseFake([
      { data: planoOrigem },
      { data: { id: "novo" } },
      { data: [refeicaoDeOrigem] },
      { data: { id: "refeicao-nova" } },
      { error: { message: "23503" } },
    ]);

    await expect(
      createNutritionService(supabase).cloneDietPlan("p1", "aluno-2", "esp-1", "Novo plano"),
    ).rejects.toEqual({ message: "23503" });
  });
});
