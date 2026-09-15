import type { AdaptiveQuestion } from "../data/anamnesisAdaptive";
import type { DeclaredMeasurementInput } from "../services/measurement.service";
import { lerRespostaNumerica } from "./anamnese";

/**
 * As medidas que a anamnese do Praticante pergunta, e o que se faz com elas
 * (issue #312): viram a primeira Assessment declarada, e não ficam em `responses`.
 *
 * Opcionais: quem não tem fita em casa segue a anamnese sem elas, e registra
 * depois pela "Nova medida". O peso e a altura continuam onde sempre estiveram,
 * porque a anamnese é a terceira fonte da Escala do Body scan.
 */

type MeasureColumn = Exclude<
  keyof DeclaredMeasurementInput,
  "assessed_at" | "weight_kg" | "height_cm"
>;

interface MeasurementQuestion extends AdaptiveQuestion {
  column: MeasureColumn;
  range: { min: number; max: number };
}

const CIRCUMFERENCE_RANGE = { min: 10, max: 250 };
const WHY_WE_ASK =
  "Opcional. Vira o ponto de partida da sua evolução de medidas, e você pode registrar de novo quando quiser.";

const QUESTION_BASES: Pick<MeasurementQuestion, "id" | "text" | "unit" | "column" | "range">[] = [
  {
    id: "measure_body_fat",
    text: "Sabe o seu percentual de gordura?",
    unit: "%",
    column: "body_fat_pct",
    range: { min: 3, max: 70 },
  },
  {
    id: "measure_chest",
    text: "Medida do peito",
    unit: "cm",
    column: "circ_chest",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_waist",
    text: "Medida da cintura",
    unit: "cm",
    column: "circ_waist",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_hip",
    text: "Medida do quadril",
    unit: "cm",
    column: "circ_hip",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_arm",
    text: "Medida do braço (um lado)",
    unit: "cm",
    column: "circ_right_arm",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_thigh",
    text: "Medida da coxa (um lado)",
    unit: "cm",
    column: "circ_right_thigh",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_calf",
    text: "Medida da panturrilha (um lado)",
    unit: "cm",
    column: "circ_right_calf",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_shoulder",
    text: "Medida dos ombros",
    unit: "cm",
    column: "circ_shoulder",
    range: CIRCUMFERENCE_RANGE,
  },
  {
    id: "measure_neck",
    text: "Medida do pescoço",
    unit: "cm",
    column: "circ_neck",
    range: CIRCUMFERENCE_RANGE,
  },
];

/** Braço, coxa e panturrilha pedem um lado só: a medida guarda no direito, e a tela lê o lado preenchido. */
export const MEASUREMENT_QUESTIONS: MeasurementQuestion[] = QUESTION_BASES.map((question) => ({
  ...question,
  type: "number",
  weight: 1,
  whyWeAsk: WHY_WE_ASK,
}));

const MEASUREMENT_IDS = new Set(MEASUREMENT_QUESTIONS.map((question) => question.id));

export interface SplitAnswers {
  /** O que vai para `student_anamnesis.responses`, sem nenhuma resposta de medida. */
  responses: Record<string, unknown>;
  /** A primeira Assessment declarada; nula sem peso e altura válidos. */
  startingMeasure: DeclaredMeasurementInput | null;
}

/**
 * Separa as respostas de medida das outras e monta a medida de partida.
 *
 * @example
 * const { responses, startingMeasure } = splitMeasurementAnswers(answers);
 */
export function splitMeasurementAnswers(answers: Record<string, unknown>): SplitAnswers {
  const responses = Object.fromEntries(
    Object.entries(answers).filter(([id]) => !MEASUREMENT_IDS.has(id)),
  );
  return { responses, startingMeasure: startingMeasureOf(answers) };
}

function startingMeasureOf(answers: Record<string, unknown>): DeclaredMeasurementInput | null {
  const weight = lerRespostaNumerica(answers.weight, "weight");
  const height = lerRespostaNumerica(answers.height, "height");
  if (!weight.ok || !height.ok) return null;
  const measure: DeclaredMeasurementInput = { weight_kg: weight.valor, height_cm: height.valor };
  for (const question of MEASUREMENT_QUESTIONS) {
    const answer = lerRespostaNumerica(answers[question.id], question.id);
    if (answer.ok && answer.valor >= question.range.min && answer.valor <= question.range.max) {
      measure[question.column] = answer.valor;
    }
  }
  return measure;
}
