import {
  type ChatMessage,
  type DietMealsProposal,
  type DietPlanProposal,
  type DietSseEvent,
  readSseStream,
} from '@elevapro/shared';
import { BffHttpError, fetchBff, getBff, lerRespostaBff, postBff } from '@/shared/bff';

/**
 * O chat de nutrição do especialista, o mesmo do web
 * (`/api/ai/nutrition/chat/[studentId]`): sessão, stream e as rotas de
 * aprovação `save-plan`/`save-meals`, que gravam o plano em rascunho (#337).
 * Nenhuma rota nova de IA.
 *
 * O token vem por parâmetro: ler a store de `auth` aqui seria módulo importando
 * módulo, e a tela já tem o token.
 */

/** Acima do teto de 60s da rota na Vercel, para não abortar uma resposta legítima. */
const CHAT_TIMEOUT_MS = 70_000;

export interface NutritionChatSession {
  sessionId: string;
  messages: ChatMessage[];
  planProposal: DietPlanProposal | null;
  planSaved: boolean;
  mealsProposal: DietMealsProposal | null;
  mealsSaved: boolean;
  savedPlanId: string | null;
  readOnly?: boolean;
}

const base = (studentId: string) => `/api/ai/nutrition/chat/${studentId}`;

export const NutritionChatService = {
  /** Retoma a sessão/rascunho indicado; sem ambos inicia uma criação independente. */
  loadSession: (token: string, studentId: string, sessionId?: string, planId?: string) =>
    getBff<NutritionChatSession>(
      `${base(studentId)}?${new URLSearchParams({
        ...(sessionId ? { sessionId } : {}),
        ...(planId ? { planId } : {}),
        ...(!sessionId && !planId ? { new: '1' } : {}),
      }).toString()}`,
      { token }
    ),

  /** Envia a mensagem e emite cada evento do stream conforme chega. */
  sendMessage: async (
    token: string,
    studentId: string,
    message: string,
    sessionId: string | null,
    onEvent: (event: DietSseEvent) => void,
    planId?: string
  ): Promise<void> => {
    const { response, url } = await fetchBff(
      base(studentId),
      { message, sessionId, ...(planId ? { planId } : {}) },
      { token, timeoutMs: CHAT_TIMEOUT_MS }
    );
    if (!response.ok) {
      const failure = await lerRespostaBff<{ code?: string }>(response, url);
      throw new BffHttpError(base(studentId), response.status, failure.code);
    }
    if (!response.body) throw new Error('Chat de nutrição respondeu sem corpo de stream');
    await readSseStream<DietSseEvent>(response.body, onEvent);
  },

  /** Grava o plano pendente desta sessão, em rascunho — não o que está na tela. */
  approvePlan: (token: string, studentId: string, sessionId: string | null) =>
    postBff<{ id: string; name: string }>(`${base(studentId)}/save-plan`, { sessionId }, { token }),

  /** Grava as refeições pendentes desta sessão no plano aprovado. */
  approveMeals: (token: string, studentId: string, sessionId: string | null, planId?: string) =>
    postBff<{ saved: { id: string; name: string }[] }>(
      `${base(studentId)}/save-meals`,
      { sessionId, ...(planId ? { planId } : {}) },
      { token }
    ),
};
