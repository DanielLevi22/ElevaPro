import { describe, expect, it } from "vitest";
import { hasUnmappedDietaryNotes, restrictionsFromAnamnesis } from "../dietaryRestrictions";

describe("restrictionsFromAnamnesis", () => {
  it("traduz as respostas de exclusão de alimento em etiquetas", () => {
    expect(
      restrictionsFromAnamnesis(["Intolerante a Lactose", "Intolerante a Glúten", "Vegano"]),
    ).toEqual(["lactose_free", "gluten_free", "vegan"]);
  });

  it("aceita a resposta única gravada como texto", () => {
    expect(restrictionsFromAnamnesis("Vegetariano")).toEqual(["vegetarian"]);
  });

  // LGPD (Art. 6°, III — necessidade): "Diabetes" é diagnóstico, e a etiqueta
  // do plano é exclusão de alimento. Levar o diagnóstico para `diet_plans` o
  // duplicaria numa segunda tabela, sob outra política de acesso.
  it("nunca transforma diagnóstico em etiqueta", () => {
    const tags = restrictionsFromAnamnesis(["Diabetes", "Intolerante a Lactose"]);

    expect(tags).toEqual(["lactose_free"]);
    expect(tags.join()).not.toMatch(/diab/i);
  });

  it("ignora 'Nenhuma', 'Outra' e resposta ausente ou de formato inesperado", () => {
    expect(restrictionsFromAnamnesis(["Nenhuma"])).toEqual([]);
    expect(restrictionsFromAnamnesis(["Outra"])).toEqual([]);
    expect(restrictionsFromAnamnesis(null)).toEqual([]);
    expect(restrictionsFromAnamnesis({ lactose: true })).toEqual([]);
    expect(restrictionsFromAnamnesis([42, "Vegano"])).toEqual(["vegan"]);
  });

  it("não repete a etiqueta", () => {
    expect(restrictionsFromAnamnesis(["Vegano", "Vegano"])).toEqual(["vegan"]);
  });
});

describe("hasUnmappedDietaryNotes", () => {
  // A tela avisa que a anamnese diz mais do que a etiqueta, sem dizer o quê.
  it("é verdadeiro quando a anamnese tem resposta que não vira etiqueta", () => {
    expect(hasUnmappedDietaryNotes(["Diabetes"])).toBe(true);
    expect(hasUnmappedDietaryNotes(["Outra", "Vegano"])).toBe(true);
  });

  it("é falso quando tudo virou etiqueta, ou não há nada", () => {
    expect(hasUnmappedDietaryNotes(["Vegano"])).toBe(false);
    expect(hasUnmappedDietaryNotes(["Nenhuma"])).toBe(false);
    expect(hasUnmappedDietaryNotes(undefined)).toBe(false);
  });
});

describe("resposta embrulhada pelo mobile", () => {
  // O mobile grava `{ questionId, value }` e o web grava o valor direto. Sem
  // desembrulhar, quem preencheu pelo celular nunca teria etiqueta sugerida.
  it("lê a resposta embrulhada como a direta", () => {
    const wrapped = { questionId: "dietary_restrictions", value: ["Diabetes", "Vegano"] };

    expect(restrictionsFromAnamnesis(wrapped)).toEqual(["vegan"]);
    expect(hasUnmappedDietaryNotes(wrapped)).toBe(true);
  });
});
