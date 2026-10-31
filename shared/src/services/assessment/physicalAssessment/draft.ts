import type {
  PhysicalAssessment,
  PhysicalAssessmentInput,
} from "../../../types/physicalAssessment.types";
import { ASSESSMENT_NUMBER_FIELDS, type AssessmentNumberField } from "./constants";

/** A ficha como o formulário a edita: tudo texto, vazio quando sem medida. */
export type AssessmentDraft = Record<AssessmentNumberField | "notes", string>;

export type ParsedAssessmentDraft =
  | { ok: true; values: PhysicalAssessmentInput }
  | { ok: false; message: string };

export const MISSING_SCALE_MESSAGE =
  "Peso e altura são obrigatórios: são eles que dão escala à análise do aluno.";

/**
 * A ficha em branco, ou preenchida com a avaliação que vai ser corrigida.
 *
 * @example assessmentDraft(null).weight_kg // ''
 */
export function assessmentDraft(assessment: PhysicalAssessment | null): AssessmentDraft {
  return Object.fromEntries([
    ...ASSESSMENT_NUMBER_FIELDS.map((key) => [key, assessment?.[key]?.toString() ?? ""]),
    ["notes", assessment?.notes ?? ""],
  ]) as AssessmentDraft;
}

/**
 * A ficha digitada em valores para gravar, ou a mensagem do que falta.
 *
 * Altura e peso não são medidas entre outras: são a Escala que calibra o body
 * scan do aluno, e a rota recusa a ficha sem os dois desde a `0037`. Barrar aqui
 * diz isso enquanto a ficha ainda está aberta. Vírgula vale como decimal: é o
 * que o teclado brasileiro oferece.
 *
 * @example parseAssessmentDraft({ ...draft, weight_kg: '80,5', height_cm: '180' })
 */
export function parseAssessmentDraft(draft: AssessmentDraft): ParsedAssessmentDraft {
  const values: PhysicalAssessmentInput = { notes: draft.notes.trim() || null };
  for (const key of ASSESSMENT_NUMBER_FIELDS) {
    const number = toNumber(draft[key]);
    if (Number.isNaN(number)) {
      return { ok: false, message: `Valor inválido em ${key}: "${draft[key]}". Use só números.` };
    }
    values[key] = number;
  }
  if (values.weight_kg == null || values.height_cm == null) {
    return { ok: false, message: MISSING_SCALE_MESSAGE };
  }
  return { ok: true, values };
}

function toNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  return Number(trimmed.replace(",", "."));
}
