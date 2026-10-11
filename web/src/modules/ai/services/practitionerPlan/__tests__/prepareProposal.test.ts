import type { PractitionerPlanProposal } from "@elevapro/shared";
import { describe, expect, it } from "vitest";
import { prepareProposal } from "../prepareProposal";

const FOODS = new Map([
  ["Arroz branco cozido", { name: "Arroz branco cozido", serving_size: 100, calories: 130 }],
  ["Ovo inteiro cozido", { name: "Ovo inteiro cozido", serving_size: 50, calories: 70 }],
]);
const CONTEXTO = {
  allowedFoods: FOODS,
  allowedExercises: new Set(["Agachamento livre"]),
  targetCalories: 500,
};

const refeicao = (itens: [string, number][]) => ({
  name: "Almoço",
  meal_time: "12:00",
  items: itens.map(([food_name, quantity]) => ({ food_name, quantity })),
});
const plano = (meals: PractitionerPlanProposal["meals"]): PractitionerPlanProposal => ({
  workouts: [],
  meals,
  explanation: "",
});

describe("prepareProposal", () => {
  it("resposta que não é JSON tem motivo próprio", () => {
    expect(prepareProposal(null, undefined, CONTEXTO)).toEqual({
      problem: "a resposta não era o JSON pedido",
    });
  });

  /** TRAVA — o alimento fora da lista (onde caem os excluídos) sai do plano, e não entra por reparo. */
  it("tira o alimento fora da lista e reescala o resto para a meta", () => {
    const result = prepareProposal(
      plano([
        refeicao([
          ["Arroz branco cozido", 200],
          ["Iogurte grego", 170],
        ]),
      ]),
      undefined,
      CONTEXTO,
    );
    if (!("proposal" in result)) throw new Error(`esperava plano, veio ${result.problem}`);
    const nomes = result.proposal.meals?.flatMap((m) => m.items.map((i) => i.food_name));
    if (nomes?.includes("Iogurte grego"))
      throw new Error("ALIMENTO EXCLUÍDO NO PLANO: o iogurte ficou");
    expect(nomes).toEqual(["Arroz branco cozido"]);
  });

  it("refeição que fica vazia sem os alimentos de fora é recusada", () => {
    expect(
      prepareProposal(plano([refeicao([["Iogurte grego", 170]])]), undefined, CONTEXTO),
    ).toEqual({
      problem: 'a refeição "Almoço" só tinha alimentos fora da lista',
    });
  });

  it("porções longe demais da meta dizem quanto veio e quanto era", () => {
    expect(
      prepareProposal(plano([refeicao([["Arroz branco cozido", 50]])]), undefined, CONTEXTO),
    ).toEqual({
      problem:
        "as porções somavam 65 kcal para uma meta de 500; longe demais para só ajustar a quantidade",
    });
  });
});
