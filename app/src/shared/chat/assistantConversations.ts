import { getBff, postBff } from '@/shared/bff';

export type AssistantModule = 'workout' | 'nutrition';
export interface AssistantConversation {
  id: string;
  title: string | null;
  module: AssistantModule;
  created_at: string;
  updated_at: string;
}

const endpoint = (studentId: string) => `/api/ai/chat/${encodeURIComponent(studentId)}/sessions`;

/** Histórico do especialista por aluno, usando o mesmo contrato do workspace web.
 * @example await assistantConversations.list(token, studentId);
 */
export const assistantConversations = {
  list: async (token: string, studentId: string): Promise<AssistantConversation[]> => {
    const result = await getBff<{ sessions: AssistantConversation[] }>(
      `${endpoint(studentId)}?module=all`,
      { token }
    );
    return result.sessions.filter(
      (session) => session.module === 'workout' || session.module === 'nutrition'
    );
  },
  create: (token: string, studentId: string, module: AssistantModule) =>
    postBff<{ sessionId: string }>(endpoint(studentId), { module }, { token }),
  rename: (token: string, studentId: string, sessionId: string, title: string) =>
    postBff<{ success: boolean }>(
      endpoint(studentId),
      { sessionId, title: title.trim() },
      { token, method: 'PATCH' }
    ),
  archive: (token: string, studentId: string, sessionId: string) =>
    postBff<{ success: boolean }>(endpoint(studentId), { sessionId }, { token, method: 'PATCH' }),
};
