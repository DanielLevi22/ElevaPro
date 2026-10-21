import type { SetPlan } from "../setPlan";

/** O que se grava ao pôr um exercício num Workout (um WorkoutItem novo). */
export interface AddWorkoutExerciseInput {
  exercise_id: string;
  sets?: number;
  reps?: string;
  weight?: string;
  rest_seconds?: number;
  order_index?: number;
  notes?: string;
  /** As séries prescritas uma a uma (#431). */
  set_plan?: SetPlan;
}

/** O que se ajusta num WorkoutItem que já está no Workout. */
export interface UpdateWorkoutExerciseInput {
  sets?: number;
  reps?: string;
  weight?: string;
  rest_seconds?: number;
  /** As séries prescritas uma a uma (#431). */
  set_plan?: SetPlan;
}
