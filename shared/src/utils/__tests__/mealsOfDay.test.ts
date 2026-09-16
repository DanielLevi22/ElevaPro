import { describe, expect, it } from "vitest";
import type { DietMeal } from "../../types/nutrition.types";
import { mealsOfDay } from "../mealsOfDay";

/**
 * Dieta única não tem dia, e é isso que a torna única.
 *
 * A gravação sempre respeitou os dois formatos — `null` na única, 0–6 na
 * cíclica. A leitura conhecia só o segundo e filtrava por igualdade de dia:
 * como `null` não é igual a nenhum dos sete, nenhuma refeição de dieta única
 * aparecia em dia nenhum, e o plano abria vazio.
 */

function refeicao(over: Partial<DietMeal> = {}): DietMeal {
  return { id: "ref-1", name: "Almoço", day_of_week: null, ...over } as DietMeal;
}

describe("refeições do dia", () => {
  // O defeito relatado: o especialista salva o plano e o aluno abre sem nada.
  it("dieta única mostra as refeições em qualquer dia", () => {
    const meals = [refeicao(), refeicao({ id: "ref-2" })];

    for (let dia = 0; dia < 7; dia++) {
      expect(mealsOfDay(meals, "unique", dia)).toHaveLength(2);
    }
  });

  it("dieta cíclica mostra só o dia escolhido", () => {
    const meals = [
      refeicao({ id: "seg", day_of_week: 1 }),
      refeicao({ id: "ter", day_of_week: 2 }),
    ];

    expect(mealsOfDay(meals, "cyclic", 1).map((m) => m.id)).toEqual(["seg"]);
    expect(mealsOfDay(meals, "cyclic", 2).map((m) => m.id)).toEqual(["ter"]);
  });

  // Domingo é dia zero: um filtro escrito com `||` o trataria como ausência.
  it("domingo é um dia como os outros na dieta cíclica", () => {
    const meals = [refeicao({ id: "dom", day_of_week: 0 })];

    expect(mealsOfDay(meals, "cyclic", 0).map((m) => m.id)).toEqual(["dom"]);
    expect(mealsOfDay(meals, "cyclic", 1)).toEqual([]);
  });

  // Refeição de plano cíclico gravada sem dia é dado incompleto, não refeição
  // de todo dia — mostrá-la sempre esconderia o defeito de quem a gravou.
  it("cíclica sem dia gravado não vira refeição de todo dia", () => {
    expect(mealsOfDay([refeicao()], "cyclic", 3)).toEqual([]);
  });

  it("plano sem tipo conhecido continua filtrando por dia", () => {
    const meals = [refeicao({ id: "qua", day_of_week: 3 })];

    expect(mealsOfDay(meals, null, 3).map((m) => m.id)).toEqual(["qua"]);
    expect(mealsOfDay(meals, undefined, 4)).toEqual([]);
  });
});
