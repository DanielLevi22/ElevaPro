import type { PhysicalAssessment } from "@elevapro/shared";
import type { ASSESSMENT_NUMBER_FIELDS } from "./constants";

export type AssessmentValues = Pick<
  PhysicalAssessment,
  (typeof ASSESSMENT_NUMBER_FIELDS)[number] | "notes"
>;

export interface AssessmentRevision {
  id: string;
  corrected_at: string;
  previous_values: AssessmentValues;
}
