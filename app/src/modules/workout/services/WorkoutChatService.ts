import {
  type BulkWorkoutProposal,
  type ChatMessage,
  type PeriodizationProposal,
  readSseStream,
  type WorkoutSseEvent,
} from '@elevapro/shared';
import { fetchBff, getBff, postBff } from '@/shared/bff';

/**
 * O mesmo chat de IA que o especialista já usa no dashboard web
 * (`/api/ai/chat/[studentId]`) — orquestrador, sessão e endpoints de
 * aprovação compartilhados, não uma rota nova para o mobile.
 *
 * O token vem por parâmetro, não de `useAuthStore` lido aqui dentro: ler a
 * store do módulo `auth` diretamente seria módulo importando módulo — quem
 * chama (a tela) já tem o token e é quem pode importar as duas pontas.
 */

/**
 * Acima do teto de 60s do plano Hobby na Vercel (`maxDuration` da rota): uma
 * resposta com uso de ferramenta pode levar quase o tempo inteiro do lado do
 * servidor, e um timeout igual abortaria o cliente antes de uma resposta
 * legítima terminar de chegar.
 */
const TIMEOUT_CHAT_MS = 70_000;

export interface WorkoutChatSession {
  sessionId: string;
  messages: ChatMessage[];
  workoutProposal: BulkWorkoutProposal | null;
  savedWorkoutTitles: string[];
  periodization: PeriodizationProposal | null;
  savedPeriodizationId: string | null;
}

export interface SavedPeriodization {
  id: string;
  name: string;
}

export interface SavedWorkouts {
  saved: { workoutId: string; title: string }[];
}

export const WorkoutChatService = {
  /**
   * Carrega a conversa do aluno — a mais recente, ou a de `sessionId` quando
   * o especialista está retomando uma específica.
   */
  loadSession: async (
    token: string,
    studentId: string,
    sessionId?: string
  ): Promise<WorkoutChatSession> => {
    const query = sessionId ? `?sessionId=${sessionId}` : '';
    return getBff<WorkoutChatSession>(`/api/ai/chat/${studentId}${query}`, { token });
  },

  /**
   * Envia uma mensagem e emite cada evento do stream conforme chega — texto,
   * proposta de periodização, proposta de treinos em lote.
   */
  sendMessage: async (
    token: string,
    studentId: string,
    message: string,
    sessionId: string | null,
    onEvent: (event: WorkoutSseEvent) => void
  ): Promise<void> => {
    const { response } = await fetchBff(
      `/api/ai/chat/${studentId}`,
      { message, sessionId },
      { token, timeoutMs: TIMEOUT_CHAT_MS }
    );
    if (!response.ok) throw new Error(`Chat de IA respondeu ${response.status}`);
    if (!response.body) throw new Error('Chat de IA respondeu sem corpo de stream');

    await readSseStream(response.body, onEvent);
  },

  /** Grava a periodização pendente desta sessão — não a que está na tela. */
  approvePeriodization: async (
    token: string,
    studentId: string,
    sessionId: string | null
  ): Promise<SavedPeriodization> =>
    postBff(`/api/ai/chat/${studentId}/save-periodization`, { sessionId }, { token }),

  /** Grava os treinos pendentes desta sessão — não os que estão na tela. */
  approveWorkouts: async (
    token: string,
    studentId: string,
    sessionId: string | null
  ): Promise<SavedWorkouts> =>
    postBff(`/api/ai/chat/${studentId}/save-workouts`, { sessionId }, { token }),
};
