import { describe, expect, it } from "vitest";
import type { DietMeal, DietMealItem, Food, ItemRegistrado } from "../../types/nutrition.types";
import { itensComExtra, refeicaoMaisProxima } from "../diarioAlimentar";

const frango = { id: "frango", name: "Frango", serving_size: 100, calories: 165 } as Food;
const banana = { id: "banana", name: "Banana", serving_size: 100, calories: 89 } as Food;

const doPlano = [
  { id: "item-1", food_id: "frango", quantity: 150, unit: "g", food: frango },
] as DietMealItem[];

const bananaDaBusca: ItemRegistrado = {
  id: "extra_1",
  quantity: 100,
  unit: "g",
  food: banana,
  origem: "busca",
};

describe("itens com extra", () => {
  // O registro sem nada gravado ainda: o extra entra junto do prato do plano,
  // e não no lugar dele — senão o frango prescrito sumia do que o aluno comeu.
  it("sem registro, copia o prato do plano e acrescenta o extra", () => {
    const itens = itensComExtra(null, doPlano, bananaDaBusca);

    expect(itens.map((i) => i.id)).toEqual(["item-1", "extra_1"]);
    expect(itens[0]).toMatchObject({ quantity: 150, food: frango });
  });

  it("não apaga a troca que já estava registrada", () => {
    const comTroca: ItemRegistrado[] = [
      {
        id: "sub_1",
        quantity: 125,
        food: frango,
        is_substitution: true,
        substituted_for: "item-1",
      },
    ];

    const itens = itensComExtra(comTroca, doPlano, bananaDaBusca);

    expect(itens).toEqual([comTroca[0], bananaDaBusca]);
  });

  // LGPD, Art. 6°, V: o especialista precisa distinguir o prescrito do que um
  // modelo estimou a partir de uma foto. A origem não pode se perder no caminho.
  it("mantém a origem do item extra", () => {
    const doScan = { ...bananaDaBusca, id: "extra_2", origem: "scan" as const };

    expect(itensComExtra(null, doPlano, doScan).at(-1)?.origem).toBe("scan");
  });

  it("registro que não é lista é tratado como vazio, e não quebra", () => {
    expect(itensComExtra({ corrompido: true }, doPlano, bananaDaBusca)).toHaveLength(2);
  });
});

describe("refeição mais próxima", () => {
  const refeicao = (id: string, horario: string | null) => ({ id, meal_time: horario }) as DietMeal;
  const refeicoes = [
    refeicao("cafe", "07:30"),
    refeicao("almoco", "12:40"),
    refeicao("jantar", "19:30"),
  ];

  it("escolhe a de horário mais perto de agora", () => {
    expect(refeicaoMaisProxima(refeicoes, "11:00")?.id).toBe("almoco");
    expect(refeicaoMaisProxima(refeicoes, "17:00")?.id).toBe("jantar");
  });

  it("no empate, fica a que já passou", () => {
    // 10:05 está a 155 min do café e do almoço.
    expect(refeicaoMaisProxima(refeicoes, "10:05")?.id).toBe("cafe");
  });

  it("aceita o horário com segundos, como parte dos planos grava", () => {
    expect(refeicaoMaisProxima([refeicao("almoco", "12:40:00")], "12:00")?.id).toBe("almoco");
  });

  // Sem horário não há como dizer que ela é a mais próxima: escolher sozinho
  // seria chute, e o aluno pode trocar a refeição antes de confirmar.
  it("ignora refeição sem horário", () => {
    expect(refeicaoMaisProxima([refeicao("livre", null)], "12:00")).toBeNull();
    expect(
      refeicaoMaisProxima([refeicao("livre", null), refeicao("jantar", "19:30")], "12:00")?.id,
    ).toBe("jantar");
  });
});
