import { describe, expect, it } from "vitest";
import { formatRpe, RPE_MAX, RPE_MIN, rpeLabel, rpeLabelComEmoji } from "../rpe";

describe("escala de RPE", () => {
  // Esta tabela é o contrato entre as duas telas: o aluno escolhe no
  // `WorkoutFeedbackModal` do mobile e o especialista lê no feed de atividades
  // do web. Enquanto havia uma cópia em cada lado, os dois podiam falar de "7"
  // com significados diferentes. Se alguém mexer nos limites, é aqui que quebra.
  const esperado: [number, string][] = [
    [1, "Muito Fácil"],
    [2, "Muito Fácil"],
    [3, "Fácil"],
    [4, "Fácil"],
    [5, "Moderado"],
    [6, "Moderado"],
    [7, "Difícil"],
    [8, "Difícil"],
    [9, "Muito Difícil"],
    [10, "Muito Difícil"],
  ];

  it.each(esperado)("traduz %i como %s", (valor, label) => {
    expect(rpeLabel(valor)).toBe(label);
  });

  it("mantém o emoji na versão que o aluno vê enquanto escolhe", () => {
    expect(rpeLabelComEmoji(8)).toBe("Difícil 🥵");
  });

  // Sem emoji de propósito: numa lista de dez alunos ele vira ruído, e o
  // especialista está comparando valores, não escolhendo o próprio.
  it("mostra número e rótulo, sem emoji, na versão do especialista", () => {
    expect(formatRpe(8)).toBe("8 — Difícil");
  });

  // A coluna `intensity` é um integer sem CHECK no banco. Um 0 ou um 11 chegando
  // aqui significa que alguém gravou fora da escala — devolver "Muito Fácil"
  // para 0 esconderia isso do especialista, que leria como esforço registrado.
  it.each([0, 11, -1, 3.5, Number.NaN])("recusa %p com o valor e o formato esperado", (valor) => {
    expect(() => rpeLabel(valor)).toThrow(
      `RPE inválido: ${valor}. Esperado um inteiro entre ${RPE_MIN} e ${RPE_MAX}.`,
    );
  });
});
