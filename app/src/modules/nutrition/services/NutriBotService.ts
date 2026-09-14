import type { SugestaoDoAssistente } from '@elevapro/shared';
import { fetchBff, lerRespostaBff } from '@/shared/bff';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  /** A sugestão aplicável que veio com a resposta, quando veio. Não vai no histórico. */
  sugestao?: SugestaoDoAssistente | null;
}

export interface RespostaDoAssistente {
  reply: string;
  sugestao: SugestaoDoAssistente | null;
}

const ROTA = '/api/ai/student/nutribot';

export const NutriBotService = {
  /**
   * A resposta com a sugestão aplicável, quando veio — a tela do aluno desenha
   * o cartão "Adicionar ao jantar" com ela.
   *
   * @example const { reply, sugestao } = await NutriBotService.perguntar(historico, 'o que janto?', token);
   */
  perguntar: async (
    chatHistory: ChatMessage[],
    userMessage: string,
    authToken: string
  ): Promise<RespostaDoAssistente> => {
    const { response, url } = await fetchBff(
      ROTA,
      {
        message: userMessage,
        // Só papel e texto: a sugestão de uma resposta anterior não volta ao provedor.
        history: chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      },
      { token: authToken }
    );

    const data = await lerRespostaBff<{ reply: string; sugestao?: SugestaoDoAssistente | null }>(
      response,
      url
    );

    if (!response.ok) {
      throw new Error(`nutribot BFF error: ${response.status}`);
    }

    // A rota antiga não manda `sugestao`: sem o campo, sem cartão.
    return { reply: data.reply, sugestao: data.sugestao ?? null };
  },

  /** Só o texto, para a tela do member, que não desenha a sugestão. */
  sendMessage: async (chatHistory: ChatMessage[], userMessage: string, authToken: string) =>
    (await NutriBotService.perguntar(chatHistory, userMessage, authToken)).reply,
};
