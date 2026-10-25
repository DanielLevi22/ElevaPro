import type {
  PhysicalAssessment,
  PhysicalAssessmentInput,
} from "../../../types/physicalAssessment.types";
import { snapshotAssessment } from "./snapshot";
import type { AssessmentRevision } from "./types";

/**
 * Como cada plataforma fala com o BFF: o web com `fetch` relativo, o app com o
 * cliente que barra redirect e a proteção da Vercel. `fallback` é a mensagem
 * quando a rota não devolve a sua.
 */
export interface AssessmentTransport {
  get<T>(path: string, fallback: string, signal?: AbortSignal): Promise<T>;
  send<T>(method: "POST" | "PATCH", path: string, body: unknown, fallback: string): Promise<T>;
}

const assessmentsPath = (studentId: string) =>
  `/api/students/${encodeURIComponent(studentId)}/assessments`;
const assessmentPath = (studentId: string, assessmentId: string) =>
  `${assessmentsPath(studentId)}/${encodeURIComponent(assessmentId)}`;

/**
 * As avaliações físicas de um aluno pelo BFF, para o web e o app.
 *
 * Pelo BFF, e não pelo Supabase direto, porque é a rota que grava o evento
 * `health.assessment.read`: a leitura de dado de saúde por terceiro precisa
 * deixar rastro, e o cliente não escreve auditoria. A medida vai sempre no
 * corpo — URL entra em log de servidor e de proxy.
 *
 * @example
 * const assessments = createPhysicalAssessmentClient(transport);
 * await assessments.list(studentId);
 */
export function createPhysicalAssessmentClient(transport: AssessmentTransport) {
  return {
    list: async (studentId: string): Promise<PhysicalAssessment[]> => {
      const result = await transport.get<{ assessments: PhysicalAssessment[] }>(
        assessmentsPath(studentId),
        "Não foi possível carregar avaliações",
      );
      return result.assessments;
    },

    create: async (studentId: string, values: PhysicalAssessmentInput) => {
      const result = await transport.send<{ assessment: PhysicalAssessment }>(
        "POST",
        assessmentsPath(studentId),
        values,
        "Não foi possível salvar a avaliação",
      );
      return result.assessment;
    },

    /** `expected` é a ficha como foi aberta: o banco recusa se outra sessão corrigiu antes. */
    correct: async (assessment: PhysicalAssessment, changes: PhysicalAssessmentInput) => {
      const result = await transport.send<{ assessment: PhysicalAssessment }>(
        "PATCH",
        assessmentPath(assessment.student_id, assessment.id),
        {
          expected: {
            ...snapshotAssessment(assessment),
            correction_version: assessment.correction_version,
          },
          changes,
        },
        "Não foi possível corrigir a avaliação.",
      );
      return result.assessment;
    },

    revisions: async (
      studentId: string,
      assessmentId: string,
      signal?: AbortSignal,
    ): Promise<AssessmentRevision[]> => {
      const result = await transport.get<{ revisions: AssessmentRevision[] }>(
        assessmentPath(studentId, assessmentId),
        "Não foi possível consultar as correções.",
        signal,
      );
      return result.revisions;
    },
  };
}

export type PhysicalAssessmentClient = ReturnType<typeof createPhysicalAssessmentClient>;
