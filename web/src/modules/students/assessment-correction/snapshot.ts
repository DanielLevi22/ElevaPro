import type { PhysicalAssessment } from "@elevapro/shared";
import { ASSESSMENT_NUMBER_FIELDS } from "./constants";
import type { AssessmentValues } from "./types";

/** Captura só os campos corrigíveis para detectar edição concorrente. Ex.: snapshotAssessment(assessment). */
export function snapshotAssessment(assessment: PhysicalAssessment): AssessmentValues {
  return Object.fromEntries([
    ...ASSESSMENT_NUMBER_FIELDS.map((key) => [key, assessment[key]]),
    ["notes", assessment.notes],
  ]) as AssessmentValues;
}
