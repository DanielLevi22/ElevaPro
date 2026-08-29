import {
  AIWorkoutDay,
  AIWorkoutItem,
  AIWorkoutResponse,
  AssistantService,
} from '@/modules/ai/services/AssistantService';
import { mensagemDeErroBff } from '@/shared/bff';
import { Exercise } from '../types';

// Re-export types for compatibility
export { AIWorkoutDay, AIWorkoutItem, AIWorkoutResponse };

export const WorkoutAIService = {
  /**
   * Generates a workout structure using the centralized Co-Pilot
   */
  generateWorkoutStructure: async (
    split: string,
    goal: string, // 'Hypertrophy', 'Strength', etc.
    studentLevel: string, // 'Beginner', 'Intermediate'
    availableExercises: Exercise[],
    userContext?: string // 'Has knee pain', etc.
  ): Promise<AIWorkoutResponse> => {
    try {
      return await AssistantService.negotiateWorkout(
        split,
        goal,
        studentLevel,
        availableExercises,
        userContext
      );
    } catch (erro) {
      // O fallback continua — um template vazio é melhor que uma tela morta —
      // mas agora ele carrega A CAUSA. Antes o `AssistantService` devolvia
      // `null` e o texto era sempre "não foi possível conectar", igual para
      // segredo de bypass recusado, variável ausente e timeout. O especialista
      // via a mesma frase nos três casos e não tinha o que fazer com ela.
      return mockFallback(split, mensagemDeErroBff(erro));
    }
  },

  generateBatchWorkoutPlan: async (
    phases: { name: string; focus: string; weeks: number }[],
    split: string,
    goal: string,
    studentLevel: string,
    availableExercises: Exercise[],
    userContext?: string
  ) => {
    return AssistantService.generateBatchWorkoutPlan(
      phases,
      split,
      goal,
      studentLevel,
      availableExercises,
      userContext
    );
  },
};

// Fallback if AI fails or no key (returns empty structure for safety)
const mockFallback = (split: string, motivo: string): AIWorkoutResponse => {
  return {
    explanation: `Não foi possível conectar à I.A. — um template básico foi gerado. ${motivo}`,
    plan: split.split('').map((letter) => ({
      letter,
      focus: 'Geral',
      exercises: [],
    })),
  };
};
