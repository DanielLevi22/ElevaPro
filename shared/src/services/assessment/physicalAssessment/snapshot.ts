import type { PhysicalAssessment } from "../../../types/physicalAssessment.types";
import { ASSESSMENT_NUMBER_FIELDS } from "./constants";
import type { AssessmentValues } from "./types";

/**
 * Só os campos corrigíveis, para o banco detectar edição concorrente.
 *
 * @example snapshotAssessment(assessment) // { weight_kg: 80, …, notes: null }
 */
export function snapshotAssessment(assessment: PhysicalAssessment): AssessmentValues {
  return Object.fromEntries([
    ...ASSESSMENT_NUMBER_FIELDS.map((key) => [key, assessment[key]]),
    ["notes", assessment.notes],
  ]) as AssessmentValues;
}
