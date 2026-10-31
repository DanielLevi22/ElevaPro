import {
  type PhysicalAssessment,
  type PhysicalAssessmentInput,
  professionalSeries,
} from '@elevapro/shared';
import { create } from 'zustand';
import { assessmentClient } from '../services/assessmentClient';

export type AssessmentsStatus = 'loading' | 'failed' | 'ready';

interface AssessmentsState {
  studentId: string | null;
  /** A série profissional, da mais recente à mais antiga. */
  assessments: PhysicalAssessment[];
  status: AssessmentsStatus;
  load: (studentId: string) => Promise<void>;
  /** Cria, ou corrige `editing`, e recarrega a série. */
  save: (
    studentId: string,
    values: PhysicalAssessmentInput,
    editing: PhysicalAssessment | null
  ) => Promise<void>;
}

/**
 * As avaliações do aluno aberto, entre a lista e o formulário.
 *
 * Só em memória, sem `persist`: é dado de saúde de terceiro, e nada dele fica no
 * aparelho depois que o app fecha. A store existe para o formulário de correção
 * abrir com a ficha que a lista já tem, sem uma segunda leitura auditada.
 *
 * @example const { assessments, status } = useAssessmentsStore();
 */
export const useAssessmentsStore = create<AssessmentsState>((set, get) => ({
  studentId: null,
  assessments: [],
  status: 'loading',

  load: async (studentId) => {
    // Outro aluno: a série anterior sai antes de a nova chegar, nunca aparece trocada.
    if (get().studentId !== studentId) set({ studentId, assessments: [] });
    set({ status: 'loading' });
    try {
      const all = await assessmentClient.list(studentId);
      if (get().studentId === studentId) {
        set({ assessments: professionalSeries(all), status: 'ready' });
      }
    } catch {
      if (get().studentId === studentId) set({ status: 'failed' });
    }
  },

  save: async (studentId, values, editing) => {
    try {
      if (editing) await assessmentClient.correct(editing, values);
      else await assessmentClient.create(studentId, values);
    } finally {
      // Também na falha: o 409 da correção concorrente só se resolve com a versão atual.
      await get().load(studentId);
    }
  },
}));
