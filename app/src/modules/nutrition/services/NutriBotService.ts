import { fetchBff, lerRespostaBff } from '@/shared/bff';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

const ROTA = '/api/ai/student/nutribot';

export const NutriBotService = {
  sendMessage: async (
    chatHistory: ChatMessage[],
    userMessage: string,
    authToken: string
  ): Promise<string> => {
    const { response, url } = await fetchBff(
      ROTA,
      {
        message: userMessage,
        history: chatHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      },
      { token: authToken }
    );

    const data = await lerRespostaBff<{ reply: string }>(response, url);

    if (!response.ok) {
      throw new Error(`nutribot BFF error: ${response.status}`);
    }

    return data.reply;
  },
};
