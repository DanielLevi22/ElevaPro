import { describe, expect, it } from "vitest";
import { getTrackQuestions } from "../../data/anamnesisAdaptive";
import { MEASUREMENT_QUESTIONS, splitMeasurementAnswers } from "../anamnesisMeasurement";

describe("splitMeasurementAnswers", () => {
  // A medida mora na Assessment: guardada também em `responses`, o mesmo dado
  // existiria em dois lugares, e a correção de um não alcançaria o outro (Art. 6°, III).
  it("tira as respostas de medida de responses e deixa o resto como veio", () => {
    const { responses } = splitMeasurementAnswers({
      main_goal: "Hipertrofia",
      weight: 78,
      height: 180,
      measure_waist: 82,
    });

    expect(responses).toEqual({ main_goal: "Hipertrofia", weight: 78, height: 180 });
  });

  it("monta a medida de partida com o peso e a altura e as medidas respondidas", () => {
    const { startingMeasure } = splitMeasurementAnswers({
      weight: { questionId: "weight", value: "78,5" },
      height: 180,
      measure_body_fat: 18,
      measure_waist: 82,
      measure_arm: 37,
    });

    expect(startingMeasure).toEqual({
      weight_kg: 78.5,
      height_cm: 180,
      body_fat_pct: 18,
      circ_waist: 82,
      circ_right_arm: 37,
    });
  });

  // Sem peso e altura válidos a Assessment não existe: os dois são a Escala do scan.
  it("sem peso ou altura válidos, não há medida de partida", () => {
    expect(splitMeasurementAnswers({ weight: 78 }).startingMeasure).toBeNull();
    expect(splitMeasurementAnswers({ weight: 78, height: 20 }).startingMeasure).toBeNull();
  });

  // Medida fora de faixa é digitação errada, e não medida: fica fora, e o resto entra.
  it("descarta a medida opcional fora de faixa sem descartar a de partida", () => {
    const { startingMeasure } = splitMeasurementAnswers({
      weight: 78,
      height: 180,
      measure_waist: 8200,
      measure_body_fat: "",
    });

    expect(startingMeasure).toEqual({ weight_kg: 78, height_cm: 180 });
  });

  it("as perguntas de medida são numéricas e opcionais, com a unidade na pergunta", () => {
    expect(
      MEASUREMENT_QUESTIONS.every((question) => question.type === "number" && question.unit),
    ).toBe(true);
  });
});

describe("getTrackQuestions — as medidas do Praticante", () => {
  // O Aluno com especialista não responde medida: a resposta seria descartada, e
  // perguntar o que não se guarda nem se usa é coleta sem finalidade (Art. 6°, I e III).
  it("sem a opção, a anamnese não pergunta medida", () => {
    const ids = getTrackQuestions("beginner").map((question) => question.id);

    expect(ids.some((id) => id.startsWith("measure_"))).toBe(false);
  });

  it("com a opção, as medidas vêm logo depois da altura", () => {
    const ids = getTrackQuestions("advanced", { withMeasurements: true }).map(
      (question) => question.id,
    );
    const height = ids.indexOf("height");

    expect(ids.slice(height + 1, height + 1 + MEASUREMENT_QUESTIONS.length)).toEqual(
      MEASUREMENT_QUESTIONS.map((question) => question.id),
    );
  });
});
