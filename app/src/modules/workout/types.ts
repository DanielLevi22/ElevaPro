// `export type ... from` reexporta mas não traz o nome para o escopo local.
import type { SaveSessionSetInput } from '@elevapro/shared';

// Alias for backward-compatibility within app module
export type {
  DayOfWeek,
  Exercise,
  Periodization,
  SaveSessionSetInput,
  TrainingPlan,
  TrainingStatus,
  Workout,
  WorkoutDifficulty,
  WorkoutExercise,
  WorkoutExercise as WorkoutItem,
  WorkoutSession,
  WorkoutSessionExercise,
} from '@elevapro/shared';

export interface SessionItem {
  id?: string;
  workout_exercise_id: string;
  /** Uma entrada por série executada, vinda de `workout_session_sets`. */
  sets: {
    set_index: number;
    reps_actual: number | null;
    weight_actual: number | null;
    completed: boolean;
  }[];
  editedSets?: number;
  editedReps?: number;
  editedWeight?: number;
  editedRestSeconds?: number;
}

export type ProgressionType = 'improved' | 'decreased' | 'maintained';

export interface ProgressionMetric {
  type: ProgressionType;
  diff: string;
  previous: number;
  current: number;
}

export interface ProgressionAnalysis {
  weight?: ProgressionMetric;
  sets?: ProgressionMetric;
  reps?: ProgressionMetric;
}

export interface EditedWorkoutItems {
  [itemId: string]: import('@elevapro/shared').WorkoutExercise;
}

export interface ShareStats {
  title: string;
  duration: string;
  calories: string;
  date: string;
  exerciseName: string;
}

export interface SaveSessionParams {
  workoutId: string;
  studentId: string;
  startedAt: string;
  completedAt: string;
  items: {
    workoutExerciseId: string;
    sets: SaveSessionSetInput[];
  }[];
  intensity: number;
  notes: string;
}
