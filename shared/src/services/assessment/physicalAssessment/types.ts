import type { PhysicalAssessment } from "../../../types/physicalAssessment.types";
import type { AssessmentNumberField } from "./constants";

/** O que a retificação pode mudar: as medidas e as observações. */
export type AssessmentValues = Pick<PhysicalAssessment, AssessmentNumberField | "notes">;

/** Uma versão anterior, preservada quando o especialista corrige a avaliação (#385). */
export interface AssessmentRevision {
  id: string;
  corrected_at: string;
  previous_values: AssessmentValues;
}
