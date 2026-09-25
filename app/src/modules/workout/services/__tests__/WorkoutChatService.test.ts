import { WorkoutChatService } from '../WorkoutChatService';

const TOKEN = 'mock-token';

function respostaSse(quadros: string): Response {
  const corpo = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(quadros));
      controller.close();
    },
  });
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/event-stream' },
    body: corpo,
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  global.fetch = jest.fn();
});

describe('WorkoutChatService', () => {
  describe('loadSession', () => {
    it('busca a conversa do aluno, sem sessionId quando não há uma escolhida', async () => {
      const mockSessao = {
        sessionId: 's1',
        messages: [],
        workoutProposal: null,
        savedWorkoutTitles: [],
        periodization: null,
        savedPeriodizationId: null,
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockSessao,
      });

      const result = await WorkoutChatService.loadSession(TOKEN, 'aluno-1');

      expect(result).toEqual(mockSessao);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/chat/aluno-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
        })
      );
    });

    it('inclui o sessionId na query quando retomando uma conversa', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });

      await WorkoutChatService.loadSession(TOKEN, 'aluno-1', 's2');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/chat/aluno-1?sessionId=s2',
        expect.anything()
      );
    });
  });

  describe('sendMessage', () => {
    it('envia a mensagem e emite os eventos do stream de resposta', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        respostaSse('data: {"type":"text","content":"oi"}\n\ndata: {"type":"done"}\n\n')
      );

      const eventos: unknown[] = [];
      await WorkoutChatService.sendMessage(TOKEN, 'aluno-1', 'Monte uma periodização', 's1', (e) =>
        eventos.push(e)
      );

      expect(eventos).toEqual([{ type: 'text', content: 'oi' }, { type: 'done' }]);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/chat/aluno-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Monte uma periodização', sessionId: 's1' }),
        })
      );
    });

    it('recusa quando o BFF responde sem corpo de stream', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'text/event-stream' },
        body: null,
      });

      await expect(
        WorkoutChatService.sendMessage(TOKEN, 'aluno-1', 'oi', null, () => {})
      ).rejects.toThrow();
    });
  });

  describe('approvePeriodization', () => {
    it('grava a periodização pendente da sessão', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ id: 'p1', name: 'Hipertrofia' }),
      });

      const result = await WorkoutChatService.approvePeriodization(TOKEN, 'aluno-1', 's1');

      expect(result).toEqual({ id: 'p1', name: 'Hipertrofia' });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/chat/aluno-1/save-periodization',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ sessionId: 's1' }) })
      );
    });
  });

  describe('approveWorkouts', () => {
    it('grava os treinos pendentes da sessão', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ saved: [{ workoutId: 'w1', title: 'Treino A' }] }),
      });

      const result = await WorkoutChatService.approveWorkouts(TOKEN, 'aluno-1', 's1');

      expect(result).toEqual({ saved: [{ workoutId: 'w1', title: 'Treino A' }] });
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/chat/aluno-1/save-workouts',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
