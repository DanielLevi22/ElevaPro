import { describe, expect, it } from "vitest";
import { suggestLoad } from "../suggestedLoad";

const SUPINO = { prescribedWeight: 10, prescribedReps: "10-12" };

describe("a carga sugerida do próximo treino", () => {
  it("sem histórico, fica a carga da prescrição", () => {
    expect(suggestLoad({ ...SUPINO, history: [] })).toEqual({
      kind: "keep",
      weightKg: 10,
      reason: "no_history",
    });
  });

  it("fácil da última vez: sobe 2,5 kg sobre a carga usada", () => {
    expect(suggestLoad({ ...SUPINO, history: [{ maxWeightKg: 12.5, effort: "easy" }] })).toEqual({
      kind: "increase",
      weightKg: 15,
      deltaKg: 2.5,
      reason: "easy",
    });
  });

  it("abaixo de 10 kg o passo é de 1 kg: 2,5 kg num halter leve é 30%", () => {
    expect(suggestLoad({ ...SUPINO, history: [{ maxWeightKg: 6, effort: "easy" }] })).toMatchObject(
      { weightKg: 7, deltaKg: 1 },
    );
  });

  it("ok: mantém a carga e pede mais repetições", () => {
    expect(suggestLoad({ ...SUPINO, history: [{ maxWeightKg: 12.5, effort: "ok" }] })).toEqual({
      kind: "keep",
      weightKg: 12.5,
      reason: "ok",
    });
  });

  it("difícil uma vez: mantém, porque desafio não é falha", () => {
    expect(
      suggestLoad({ ...SUPINO, history: [{ maxWeightKg: 12.5, effort: "hard" }] }),
    ).toMatchObject({ kind: "keep", reason: "hard_once" });
  });

  it("difícil duas vezes seguidas: desce 5%, em meio quilo", () => {
    expect(
      suggestLoad({
        ...SUPINO,
        history: [
          { maxWeightKg: 40, effort: "hard" },
          { maxWeightKg: 40, effort: "hard" },
        ],
      }),
    ).toEqual({ kind: "decrease", weightKg: 38, deltaKg: -2, reason: "hard_twice" });
  });

  it("sem resposta de esforço, mantém a carga usada", () => {
    expect(
      suggestLoad({ ...SUPINO, history: [{ maxWeightKg: 12.5, effort: null }] }),
    ).toMatchObject({ kind: "keep", weightKg: 12.5, reason: "no_answer" });
  });

  it("sem carga e fácil: uma repetição a mais", () => {
    expect(
      suggestLoad({
        prescribedWeight: null,
        prescribedReps: "12",
        history: [{ maxWeightKg: 0, effort: "easy" }],
      }),
    ).toEqual({ kind: "add_reps", reps: 1, reason: "easy" });
  });

  it("por tempo e fácil: dez segundos a mais", () => {
    expect(
      suggestLoad({
        prescribedWeight: null,
        prescribedReps: "40 s",
        history: [{ maxWeightKg: 0, effort: "easy" }],
      }),
    ).toEqual({ kind: "add_seconds", seconds: 10, reason: "easy" });
  });

  it("na semana de descarga a carga fica a mesma, mesmo depois de fácil", () => {
    expect(
      suggestLoad({
        prescribedWeight: 10,
        prescribedReps: "10-12",
        history: [{ maxWeightKg: 12.5, effort: "easy" }],
        deload: true,
      }),
    ).toEqual({ kind: "keep", weightKg: 12.5, reason: "deload" });
  });
});
