import { describe, expect, it } from "vitest";
import { resumoDaPrevia } from "../previaDaProposta";

/**
 * A proposta aparecendo enquanto o modelo a escreve.
 *
 * O que este módulo promete é o meio-termo honesto: mostrar o que já dá para
 * saber, e nada além. Um treino sem título ainda não é um treino; uma série
 * sem repetição não vira "3×" na tela.
 */

const TREINOS = "propose_workouts";
const PERIODIZACAO = "propose_periodization";
const PLANO = "propose_diet_plan";
const REFEICOES = "propose_meals";

describe("prévia dos treinos", () => {
  it("a fase vira título assim que chega", () => {
    expect(resumoDaPrevia(TREINOS, '{"phase_name":"Base","workouts":[')).toEqual({
      titulo: "Treinos · Base",
      linhas: [],
    });
  });

  it("cada treino aparece quando o título fecha", () => {
    const cru = '{"phase_name":"Base","workouts":[{"title":"Treino A"},{"title":"Treino B"';

    expect(resumoDaPrevia(TREINOS, cru)?.linhas).toEqual([
      { nivel: 0, texto: "Treino A" },
      { nivel: 0, texto: "Treino B" },
    ]);
  });

  it("o exercício entra com séries e repetições, e só com as duas", () => {
    const completo =
      '{"workouts":[{"title":"A","exercises":[{"exercise_name":"Supino","sets":3,"reps":"8-12"}';

    expect(resumoDaPrevia(TREINOS, completo)?.linhas).toEqual([
      { nivel: 0, texto: "A" },
      { nivel: 1, texto: "Supino", detalhe: "3×8-12" },
    ]);
  });

  // O caso que decide se dá para confiar no que está na tela.
  it("exercício com série mas sem repetição não mostra detalhe pela metade", () => {
    const cru =
      '{"workouts":[{"title":"A","exercises":[{"exercise_name":"Supino","sets":3,"reps":"8-1';

    expect(resumoDaPrevia(TREINOS, cru)?.linhas).toEqual([
      { nivel: 0, texto: "A" },
      { nivel: 1, texto: "Supino", detalhe: undefined },
    ]);
  });

  it("treino sem título ainda não é treino", () => {
    const cru = '{"phase_name":"Base","workouts":[{"title":"Treino A"},{';

    expect(resumoDaPrevia(TREINOS, cru)?.linhas).toEqual([{ nivel: 0, texto: "Treino A" }]);
  });

  it("sem fase, o título é o genérico da ferramenta", () => {
    expect(resumoDaPrevia(TREINOS, '{"workouts":[{"title":"Treino A"')?.titulo).toBe("Treinos");
  });
});

describe("prévia da periodização", () => {
  it("mostra as fases com a duração de cada uma", () => {
    const cru = '{"name":"Hipertrofia 12","phases":[{"name":"Adaptação","weeks":4,"focus":"Base"}';

    expect(resumoDaPrevia(PERIODIZACAO, cru)).toEqual({
      titulo: "Hipertrofia 12",
      linhas: [{ nivel: 0, texto: "Adaptação", detalhe: "4 sem" }],
    });
  });

  it("fase sem semanas ainda mostra o foco, quando ele já chegou", () => {
    const cru = '{"phases":[{"name":"Adaptação","weeks":';

    expect(resumoDaPrevia(PERIODIZACAO, cru)).toEqual({
      titulo: "Periodização",
      linhas: [{ nivel: 0, texto: "Adaptação", detalhe: undefined }],
    });
  });
});

describe("prévia do plano alimentar", () => {
  it("as metas entram uma a uma, na ordem do cartão", () => {
    const cru =
      '{"name":"Cutting 8","duration_weeks":8,"target_calories":2200,"target_protein":180';

    expect(resumoDaPrevia(PLANO, cru)).toEqual({
      titulo: "Cutting 8",
      linhas: [
        { nivel: 0, texto: "8 semanas" },
        { nivel: 0, texto: "2200 kcal" },
      ],
    });
  });
});

describe("prévia das refeições", () => {
  it("os alimentos entram embaixo da refeição a que pertencem", () => {
    const cru =
      '{"meals":[{"name":"Café da manhã","meal_time":"07:00","items":[{"food_name":"Aveia","quantity":40,"unit":"g"}';

    expect(resumoDaPrevia(REFEICOES, cru)).toEqual({
      titulo: "Refeições",
      linhas: [
        { nivel: 0, texto: "Café da manhã", detalhe: "07:00" },
        { nivel: 1, texto: "Aveia", detalhe: "40 g" },
      ],
    });
  });
});

describe("quando não há o que mostrar", () => {
  it("ferramenta sem prévia devolve nada", () => {
    expect(resumoDaPrevia("query_exercises", '{"muscle_group":"peito"}')).toBeNull();
  });

  it("nada chegou ainda devolve nada", () => {
    expect(resumoDaPrevia(TREINOS, "{")).toBeNull();
    expect(resumoDaPrevia(TREINOS, "")).toBeNull();
  });

  it("lixo que não é json devolve nada em vez de derrubar a tela", () => {
    expect(resumoDaPrevia(TREINOS, "<html>")).toBeNull();
  });
});
