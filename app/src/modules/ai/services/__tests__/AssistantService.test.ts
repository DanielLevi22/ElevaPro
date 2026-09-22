import { AssistantService } from '../AssistantService';

jest.mock('@/modules/auth/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { access_token: 'mock-token' } }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  global.fetch = jest.fn();
});

describe('AssistantService', () => {
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
