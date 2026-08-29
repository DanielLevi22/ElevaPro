import { WorkoutAIService } from '../WorkoutAIService';

jest.mock('@/modules/auth/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ session: { access_token: 'mock-token' } }),
  },
}));

const mockExercises = [
  { id: '1', name: 'Supino Reto', muscle_group: 'Peito' },
  { id: '2', name: 'Tríceps Corda', muscle_group: 'Tríceps' },
] as never;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
  global.fetch = jest.fn();
});

describe('WorkoutAIService', () => {
  it('should return AI generated structure on success', async () => {
    const mockResponse = {
      explanation: 'Training Plan Logic...',
      plan: [
        {
          letter: 'A',
          focus: 'Peitoral e Tríceps',
          exercises: [
            { exerciseName: 'Supino Reto', sets: 3, reps: '10-12', rest: 60, technique: 'Normal' },
          ],
        },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => mockResponse,
    });

    const result = await WorkoutAIService.generateWorkoutStructure(
      'A',
      'Hipertrofia',
      'Intermediário',
      mockExercises
    );

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/ai/workout/negotiate',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should return fallback structure on API failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const result = await WorkoutAIService.generateWorkoutStructure(
      'AB',
      'Hipertrofia',
      'Intermediário',
      mockExercises
    );

    expect(result.explanation).toContain('Não foi possível conectar');
    expect(result.plan).toHaveLength(2);
    expect(result.plan[0].letter).toBe('A');
    expect(result.plan[1].letter).toBe('B');
    expect(result.plan[0].exercises).toEqual([]);
  });

  it('should return fallback when BFF returns 4xx', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });

    const result = await WorkoutAIService.generateWorkoutStructure(
      'A',
      'Hipertrofia',
      'Iniciante',
      mockExercises
    );

    expect(result.explanation).toContain('Não foi possível conectar');
  });
});
