import type { PhysicalAssessment } from "../../../types/physicalAssessment.types";

/**
 * A série profissional: só o que o especialista mediu, na ordem recebida.
 *
 * ADR-0030: a série do especialista nunca compara uma medida declarada pelo
 * aluno — fita e declaração não são o mesmo instrumento.
 *
 * @example professionalSeries(assessments).length
 */
export function professionalSeries(assessments: PhysicalAssessment[]): PhysicalAssessment[] {
  return assessments.filter((assessment) => assessment.measured_by === "specialist");
}

/**
 * Quanto o peso mudou desde a avaliação anterior, em kg com uma casa.
 *
 * @example weightDeltaKg(current, previous) // -1.2
 */
export function weightDeltaKg(
  current: PhysicalAssessment,
  previous: PhysicalAssessment | null,
): number | null {
  if (current.weight_kg === null || previous?.weight_kg == null) return null;
  return Number((current.weight_kg - previous.weight_kg).toFixed(1));
}

/**
 * IMC com uma casa, ou `null` sem peso e altura.
 *
 * @example bodyMassIndex({ weight_kg: 80, height_cm: 180 }) // 24.7
 */
export function bodyMassIndex(
  assessment: Pick<PhysicalAssessment, "weight_kg" | "height_cm">,
): number | null {
  const { weight_kg: weight, height_cm: height } = assessment;
  if (!weight || !height) return null;
  return Number((weight / (height / 100) ** 2).toFixed(1));
}

export interface AssessmentViewer {
  id: string;
  /** `update` de `PhysicalAssessment` no CASL. */
  canUpdate: boolean;
  /** `read` de `PhysicalAssessment` no CASL. */
  canRead: boolean;
}

/**
 * O que quem está olhando pode fazer com uma avaliação.
 *
 * É o espelho de interface da RPC `correct_physical_assessment` e da RLS de
 * `physical_assessment_revisions`: quem decide é o banco, e isto só evita
 * oferecer o botão que o banco vai recusar.
 *
 * @example assessmentActions(assessment, viewer, studentId).canCorrect
 */
export function assessmentActions(
  assessment: PhysicalAssessment,
  viewer: AssessmentViewer,
  studentId: string,
): { canCorrect: boolean; canSeeHistory: boolean } {
  // Sessão ainda carregando dá id vazio, e vazio não é dono de nada.
  if (!viewer.id) return { canCorrect: false, canSeeHistory: false };
  const isAuthor = assessment.specialist_id === viewer.id;
  return {
    canCorrect: viewer.canUpdate && assessment.measured_by === "specialist" && isAuthor,
    canSeeHistory: viewer.canRead && (viewer.id === studentId || (viewer.canUpdate && isAuthor)),
  };
}
