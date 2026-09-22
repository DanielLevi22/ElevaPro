export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface PeriodizationProposal {
  name: string;
  goal: string;
  durationWeeks: number;
  /** AAAA-MM-DD. O banco recusa nulo desde a 0024. */
  startDate: string;
  level: string;
  phases: {
    name: string;
    weeks: number;
    focus: string;
  }[];
}

export interface BulkWorkoutExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes?: string;
}

export interface BulkWorkoutItem {
  title: string;
  muscle_group?: string;
  difficulty?: string;
  day_of_week?: string;
  description?: string;
  exercises?: BulkWorkoutExercise[];
}

export interface BulkWorkoutProposal {
  phase_id: string;
  phase_name: string;
  workouts: BulkWorkoutItem[];
}

/**
 * O contrato de eventos do chat de treino (`/api/ai/chat/[studentId]`).
 *
 * Mesmo formato que web e mobile leem do stream — web já emite isto hoje;
 * aqui é o ponto único de onde os dois tipam o parse.
 */
export type WorkoutSseEvent =
  | { type: "text"; content: string }
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_end"; tool: string }
  | { type: "proposal_building"; tool: string; partial: string }
  | { type: "proposal"; data: PeriodizationProposal }
  | { type: "workout_proposal"; data: BulkWorkoutProposal }
  | { type: "saved"; entity: "periodization"; id: string; name: string }
  | { type: "done" }
  | { type: "error"; message: string };
