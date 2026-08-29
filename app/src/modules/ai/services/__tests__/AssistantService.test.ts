import { AssistantService } from '../AssistantService';

jest.mock('@/modules/auth/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { access_token: 'mock-token' } }),
  },
}));

// biome-ignore lint/suspicious/noExplicitAny: mock data fixture
const mockExercises: any[] = [
  { name: 'Supino Reto', muscle_group: 'Peitoral' },
  { name: 'Agachamento Livre', muscle_group: 'Quadríceps' },
];

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  global.fetch = jest.fn();
});

describe('AssistantService', () => {
  describe('negotiateWorkout', () => {
    it('should call BFF and return workout response', async () => {
      const mockResponse = { explanation: 'Plano focado em peito.', plan: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockResponse,
      });

      const result = await AssistantService.negotiateWorkout(
        'A',
        'Hipertrofia',
        'Intermediário',
        mockExercises,
        'Foco em peito'
      );

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/workout/negotiate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
          body: expect.stringContaining('Hipertrofia'),
        })
      );
    });

    // Prova negativa: se o serviço voltar a engolir, este teste falha nomeando
    // o dano. O `null` que ele devolvia era indistinguível de "a IA respondeu
    // que não dá", e apagava a causa que o `client.ts` acabara de nomear —
    // o aluno via "indisponível" e ninguém sabia qual das três causas era.
    it('propaga a falha em vez de devolver null, preservando a causa', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        AssistantService.negotiateWorkout('A', 'Hipertrofia', 'Intermediário', mockExercises)
      ).rejects.toThrow(/elevapro-preview|localhost|Network error/);
    });
  });

  describe('generateBatchWorkoutPlan', () => {
    it('should call BFF and return batch response', async () => {
      const mockBatch = {
        '0': { explanation: 'Fase 1', plan: [] },
        '1': { explanation: 'Fase 2', plan: [] },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => mockBatch,
      });

      const result = await AssistantService.generateBatchWorkoutPlan(
        [
          { name: 'Adaptação', focus: 'Técnica', weeks: 2 },
          { name: 'Força', focus: 'Carga', weeks: 4 },
        ],
        'ABC',
        'Força',
        'Avançado',
        mockExercises
      );

      expect(result).toEqual(mockBatch);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/workout/batch',
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Objeto vazio é pior que `null`: o chamador itera zero fases e conclui que
    // a IA não tinha nada a dizer.
    it('propaga a falha em vez de devolver objeto vazio', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(
        AssistantService.generateBatchWorkoutPlan(
          [],
          'A',
          'Hipertrofia',
          'Iniciante',
          mockExercises
        )
      ).rejects.toThrow();
    });
  });

  describe('analyzeNutritionAdherence', () => {
    it('should call BFF and return summary text', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ summary: 'Ótima aderência!' }),
      });

      const result = await AssistantService.analyzeNutritionAdherence(
        'Daniel',
        { totalMeals: 10, completedMeals: 8, logs: [] },
        'Plano Bulk'
      );

      expect(result).toBe('Ótima aderência!');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/ai/nutrition/adherence',
        expect.objectContaining({ method: 'POST' })
      );
    });

    // O texto fixo daqui chegava à tela como se fosse a análise: o especialista
    // lia "não foi possível gerar" sem saber se era rede, plataforma ou plano
    // vazio, e não havia o que fazer com a frase.
    it('propaga a falha em vez de devolver texto fixo', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      await expect(
        AssistantService.analyzeNutritionAdherence(
          'Daniel',
          { totalMeals: 10, completedMeals: 5, logs: [] },
          'Plano X'
        )
      ).rejects.toThrow();
    });
  });
});
