import type { ToolDefinition } from "../providers/types";

export const STUDENT_COACH_TOOLS: ToolDefinition[] = [
  {
    name: "propose_plan",
    description:
      "Propõe um plano completo de treino e nutrição para o aluno revisar e aprovar. Use após ter todas as informações necessárias. O aluno verá um card de proposta antes de confirmar.",
    input_schema: {
      type: "object",
      properties: {
        workout: {
          type: "object",
          description: "Estrutura do plano de treino",
          properties: {
            split_name: { type: "string", description: 'Ex: "Push-Pull-Legs 4 dias"' },
            days_per_week: { type: "number" },
            duration_weeks: { type: "number" },
            goal: {
              type: "string",
              description: 'Objetivo do treino: "Hipertrofia", "Emagrecimento", etc.',
            },
            level: { type: "string" },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day_label: { type: "string", description: 'Ex: "Segunda — Peito e Tríceps"' },
                  muscle_groups: { type: "array", items: { type: "string" } },
                  exercise_count: { type: "number" },
                  duration_min: { type: "number" },
                },
                required: ["day_label", "muscle_groups", "exercise_count", "duration_min"],
              },
            },
          },
          required: ["split_name", "days_per_week", "duration_weeks", "goal", "level", "days"],
        },
        nutrition: {
          type: "object",
          description: "Estrutura do plano alimentar",
          properties: {
            daily_calories: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            meals_count: { type: "number" },
            strategy: {
              type: "string",
              description: 'Ex: "Déficit de 500 kcal/dia para perda de gordura"',
            },
          },
          required: ["daily_calories", "protein_g", "carbs_g", "fat_g", "meals_count", "strategy"],
        },
        goal_summary: {
          type: "string",
          description:
            'Resumo do objetivo estimado, ex: "Perder 5–7 kg em 2 meses com 80% de aderência"',
        },
        reasoning: {
          type: "string",
          description: "Breve justificativa das escolhas principais (2-4 linhas)",
        },
      },
      required: ["workout", "nutrition", "goal_summary"],
    },
  },
];

export interface WorkoutDayProposal {
  day_label: string;
  muscle_groups: string[];
  exercise_count: number;
  duration_min: number;
}

export interface WorkoutProposal {
  split_name: string;
  days_per_week: number;
  duration_weeks: number;
  goal: string;
  level: string;
  days: WorkoutDayProposal[];
}

export interface NutritionProposal {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meals_count: number;
  strategy: string;
}

export interface PlanProposalData {
  workout: WorkoutProposal;
  nutrition: NutritionProposal;
  goal_summary: string;
  reasoning?: string;
}
