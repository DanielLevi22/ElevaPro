import { describe, expect, it } from "vitest";
import type { DietMealItem, Food, ItemRegistrado } from "../../../types/nutrition.types";
import { criarSupabaseFake } from "../../__tests__/supabaseFake";
import { createDiarioAlimentar } from "../diarioAlimentar.service";

const frango = { id: "frango", name: "Frango", serving_size: 100, calories: 165 } as Food;
const doPlano = [{ id: "item-1", quantity: 150, unit: "g", food: frango }] as DietMealItem[];
const prato: Omit<ItemRegistrado, "id"> = {
  quantity: 1,
  unit: "porção",
  food: { name: "Bowl", serving_size: 1, calories: 380, protein: 22, carbs: 45, fat: 15 },
  origem: "scan",
};

const registro = {
  alunoId: "aluno-1",
  planoId: "plano-1",
  refeicaoId: "almoco",
  data: "2026-09-13",
  doPlano,
  extras: [prato],
};

describe("diário alimentar — registrar item extra", () => {
  // O registro da data vem do banco, e não do que a tela tem na memória: a tela
  // pode estar em outro dia, e juntar com aqueles itens apagaria a troca daqui.
  it("lê o registro da refeição naquela data, só com as colunas usadas", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: null },
      { data: { id: "novo" } },
      {},
    ]);
    await createDiarioAlimentar(supabase).registrarItemExtra(registro);

    expect(chamadas[0].tabela).toBe("meal_logs");
    expect(chamadas[0].select).toBe("id, actual_items");
    expect(chamadas[0].filtros).toEqual({
      student_id: "aluno-1",
      diet_meal_id: "almoco",
      logged_date: "2026-09-13",
    });
  });

  it("sem registro, cria desmarcado e grava o prato do plano com o extra", async () => {
    const { supabase, chamadas } = criarSupabaseFake([
      { data: null },
      { data: { id: "novo" } },
      {},
    ]);
    await createDiarioAlimentar(supabase).registrarItemExtra(registro);

    expect(chamadas[1].payload).toMatchObject({ diet_meal_id: "almoco", completed: false });
    const itens = (chamadas[2].payload as { actual_items: ItemRegistrado[] }).actual_items;
    expect(itens.map((i) => i.id)).toEqual(["item-1", expect.stringMatching(/^extra_/)]);
    expect(chamadas[2].filtros).toEqual({ id: "novo" });
  });

  // LGPD, Art. 6°, V: o prato do scan é estimativa de modelo. Sem a origem, o
  // especialista leria "Bowl, 380 kcal" como se o aluno tivesse pesado.
  it("com registro, preserva a troca e grava a origem do extra", async () => {
    const troca = { id: "sub_1", quantity: 125, food: frango, substituted_for: "item-1" };
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "log-1", actual_items: [troca] } },
      {},
    ]);
    await createDiarioAlimentar(supabase).registrarItemExtra(registro);

    const gravado = chamadas[1];
    expect(gravado.metodos.map((m) => m.nome)).toContain("update");
    const itens = (gravado.payload as { actual_items: ItemRegistrado[] }).actual_items;
    expect(itens[0]).toEqual(troca);
    expect(itens[1]).toMatchObject({ origem: "scan", food: { name: "Bowl" } });
  });

  // O prato do scan separado em componentes entra como um item por componente:
  // o especialista lê o que foi estimado, e não um "Bowl" opaco.
  it("grava vários extras de uma vez, cada um com id próprio", async () => {
    const arroz = { ...prato, food: { ...prato.food, name: "Arroz" } } as typeof prato;
    const { supabase, chamadas } = criarSupabaseFake([
      { data: { id: "log-1", actual_items: [] } },
      {},
    ]);
    await createDiarioAlimentar(supabase).registrarItemExtra({
      ...registro,
      extras: [prato, arroz],
    });

    const itens = (chamadas[1].payload as { actual_items: ItemRegistrado[] }).actual_items;
    expect(itens.map((i) => i.food?.name)).toEqual(["Bowl", "Arroz"]);
    expect(new Set(itens.map((i) => i.id)).size).toBe(2);
  });

  it("propaga erro da leitura em vez de gravar por cima", async () => {
    const { supabase, chamadas } = criarSupabaseFake({ error: { message: "42501" } });
    await expect(createDiarioAlimentar(supabase).registrarItemExtra(registro)).rejects.toEqual({
      message: "42501",
    });
    expect(chamadas).toHaveLength(1);
  });
});
