export type WorkoutDifficulty = "beginner" | "intermediate" | "advanced";
export type TrainingStatus = "planned" | "active" | "completed";
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type PeriodizationObjective =
  | "hypertrophy"
  | "strength"
  | "endurance"
  | "weight_loss"
  | "conditioning"
  | "general_fitness";

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string | null;
  description: string | null;
  video_url: string | null;
  is_verified: boolean;
  created_by: string | null;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  rest_seconds: number | null;
  order_index: number;
  notes: string | null;
  created_at: string;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  specialist_id: string | null;
  student_id: string | null;
  training_plan_id: string | null;
  title: string;
  description: string | null;
  muscle_group: string | null;
  difficulty: WorkoutDifficulty | null;
  day_of_week: DayOfWeek | null;
  created_at: string;
  updated_at: string;
  exercises?: WorkoutExercise[];
  exercises_count?: number;
}

export interface TrainingPlan {
  id: string;
  periodization_id: string;
  name: string;
  status: TrainingStatus;
  start_date: string | null;
  end_date: string | null;
  order_index: number;
  created_at: string;
  workouts_count?: number;
}

export interface Periodization {
  id: string;
  specialist_id: string;
  student_id: string;
  name: string;
  objective: string | null;
  status: TrainingStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  student?: { id: string; full_name: string | null; email: string };
  training_plans_count?: number;
}

export interface WorkoutSession {
  id: string;
  student_id: string;
  workout_id: string | null;
  started_at: string;
  completed_at: string | null;
  intensity: number | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  workout_exercise_id: string | null;
  created_at: string;
}

/**
 * Uma série executada.
 *
 * Prescrito e executado são campos distintos de propósito: comparar o que foi
 * pedido com o que foi feito é o que torna a evolução mensurável. Gravar o
 * executado nos dois destrói essa informação.
 */
export interface WorkoutSessionSet {
  id: string;
  session_exercise_id: string;
  set_index: number;
  reps_prescribed: string | null;
  reps_actual: number | null;
  weight_prescribed: number | null;
  weight_actual: number | null;
  rest_prescribed: number | null;
  rest_actual: number | null;
  completed: boolean;
  skipped: boolean;
  created_at: string;
}

// Input types

export interface CreateExerciseInput {
  name: string;
  muscle_group?: string;
  description?: string;
  video_url?: string;
}

export interface CreateWorkoutInput {
  specialist_id?: string | null;
  student_id?: string | null;
  training_plan_id?: string | null;
  title: string;
  description?: string | null;
  muscle_group?: string | null;
  difficulty?: WorkoutDifficulty | null;
  day_of_week?: DayOfWeek | null;
}

export interface UpdateWorkoutInput {
  title?: string;
  description?: string | null;
  muscle_group?: string | null;
  difficulty?: WorkoutDifficulty | null;
  day_of_week?: DayOfWeek | null;
  training_plan_id?: string | null;
}

export interface AddWorkoutExerciseInput {
  exercise_id: string;
  sets?: number;
  reps?: string;
  weight?: string;
  rest_seconds?: number;
  order_index?: number;
  notes?: string;
}

export interface CreatePeriodizationInput {
  specialist_id?: string;
  student_id: string;
  name: string;
  objective?: string;
  start_date?: string;
  end_date?: string;
}

export interface UpdatePeriodizationInput {
  name?: string;
  objective?: string;
  status?: TrainingStatus;
  start_date?: string;
  end_date?: string;
}

export interface CreateTrainingPlanInput {
  periodization_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  order_index?: number;
}

export interface UpdateTrainingPlanInput {
  name?: string;
  status?: TrainingStatus;
  start_date?: string;
  end_date?: string;
  order_index?: number;
}

export interface CreateWorkoutSessionInput {
  student_id: string;
  workout_id?: string | null;
  started_at: string;
  completed_at?: string | null;
  intensity?: number;
  notes?: string;
}

/** Uma série como a tela de execução a conhece. */
export interface SaveSessionSetInput {
  reps_prescribed?: string | null;
  reps_actual?: number | null;
  weight_prescribed?: number | null;
  weight_actual?: number | null;
  rest_prescribed?: number | null;
  rest_actual?: number | null;
  completed?: boolean;
  skipped?: boolean;
}

export interface SaveSessionExerciseInput {
  workout_exercise_id?: string | null;
  /** Exercício efetivamente feito, quando difere do prescrito. */
  exercise_id?: string | null;
  sets: SaveSessionSetInput[];
}
