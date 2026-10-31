import {
  type AssessmentViewer,
  assessmentActions,
  type PhysicalAssessment,
} from '@elevapro/shared';
import { useAuthStore, useCan } from '@/auth';

/**
 * O que quem está logado pode fazer com cada avaliação do aluno: corrigir, ver correções.
 *
 * @example const actionsFor = useAssessmentActions(studentId); actionsFor(a).canCorrect
 */
export function useAssessmentActions(studentId: string) {
  const viewer: AssessmentViewer = {
    id: useAuthStore((state) => state.user?.id ?? ''),
    canUpdate: useCan('update', 'PhysicalAssessment'),
    canRead: useCan('read', 'PhysicalAssessment'),
  };
  return {
    canCreate: viewer.canUpdate,
    actionsFor: (assessment: PhysicalAssessment) =>
      assessmentActions(assessment, viewer, studentId),
  };
}
