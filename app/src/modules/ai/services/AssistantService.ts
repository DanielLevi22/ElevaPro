import { useAuthStore } from '@/modules/auth/store/authStore';
import { Exercise } from '@/modules/workout/types';
import { postBff as postBffCompartilhado } from '@/shared/bff';

// Re-exporting types for consumers
export interface AIWorkoutItem {
  exerciseName: string;
  sets: number;
  reps: string;
  rest: number;
  technique?: string;
  observation?: string;
  load_suggestion?: string;
}

export interface AIWorkoutDay {
  letter: string;
  focus: string;
  exercises: AIWorkoutItem[];
}

export interface AIWorkoutResponse {
  explanation: string;
  plan: AIWorkoutDay[];
}

function getToken(): string {
  const token = useAuthStore.getState().session?.access_token;
  if (!token) throw new Error('Authentication required');
  return token;
}

/**
 * O `?? ''` que morava em `bffBase` era tão mudo quanto o `${undefined}` dos
 * outros serviços: sem a variável, virava caminho relativo — e em React Native
 * não existe origem para completar um caminho relativo. Agora a ausência tem
 * nome (`BffConfigError`) e o helper compartilhado cuida do resto.
 */
async function postBff<T>(path: string, body: Record<string, unknown>): Promise<T> {
  return postBffCompartilhado<T>(path, body, { token: getToken() });
}

export const AssistantService = {
  /**
   * Negotiates and generates a workout plan based on context and feedback.
   */
  negotiateWorkout: async (
    split: string,
    goal: string,
    studentLevel: string,
    availableExercises: Exercise[],
    userContext?: string
  ): Promise<AIWorkoutResponse> => {
    const exercisesList = availableExercises
      .map((e) => `- ${e.name} (${e.muscle_group})`)
      .join('\n');

    // Sem `try`: o `catch` que morava aqui devolvia `null`, indistinguível de
    // "a IA respondeu que não dá", e apagava a causa que o `client.ts` acabara
    // de nomear. Quem decide o que fazer com a falha é o `WorkoutAIService`,
    // que tem o fallback — e agora ele sabe o motivo para escrever na tela.
    return postBff<AIWorkoutResponse>('/api/ai/workout/negotiate', {
      split,
      goal,
      studentLevel,
      exercisesList,
      userContext,
    });
  },

  /**
   * Generates workouts for MULTIPLE phases in a single request.
   */
  generateBatchWorkoutPlan: async (
    phases: { name: string; focus: string; weeks: number }[],
    split: string,
    goal: string,
    studentLevel: string,
    availableExercises: Exercise[],
    userContext?: string
  ): Promise<{ [phaseIndex: number]: AIWorkoutResponse }> => {
    const exercisesList = availableExercises
      .map((e) => `- ${e.name} (${e.muscle_group})`)
      .join('\n');

    return postBff<Record<number, AIWorkoutResponse>>('/api/ai/workout/batch', {
      phases,
      split,
      goal,
      studentLevel,
      exercisesList,
      userContext,
    });
  },

  /**
   * Generates a weekly nutrition adherence summary
   */
  analyzeNutritionAdherence: async (
    _studentName: string,
    adherenceData: {
      totalMeals: number;
      completedMeals: number;
      logs: Record<string, unknown>[];
    },
    planName: string
  ): Promise<string> => {
    const result = await postBff<{ summary: string }>('/api/ai/nutrition/adherence', {
      planName,
      adherenceData,
    });
    return result.summary;
  },
};
