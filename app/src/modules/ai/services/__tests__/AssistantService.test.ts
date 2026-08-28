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

    it('should return null on fetch failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await AssistantService.negotiateWorkout(
        'A',
        'Hipertrofia',
        'Intermediário',
        mockExercises
      );

      expect(result).toBeNull();
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

    it('should return empty object on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      const result = await AssistantService.generateBatchWorkoutPlan(
        [],
        'A',
        'Hipertrofia',
        'Iniciante',
        mockExercises
      );

      expect(result).toEqual({});
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

    it('should return fallback text on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));

      const result = await AssistantService.analyzeNutritionAdherence(
        'Daniel',
        { totalMeals: 10, completedMeals: 5, logs: [] },
        'Plano X'
      );

      expect(result).toContain('Não foi possível');
    });
  });
});
