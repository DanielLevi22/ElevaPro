import type { DietGuard } from "../utils/practitionerDietTarget";

/**
 * O plano do onboarding do Praticante (#365), como o BFF gera e o app mostra
 * em O9. Mora no `shared` porque as duas pontas leem a mesma forma.
 */

export type PlanDayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface PractitionerPlanProposal {
  workouts: {
    title: string;
    day_of_week: PlanDayOfWeek;
    muscle_group?: string;
    /** O esporte praticado entra como sessão opcional, marcada como tal (#365). */
    optional: boolean;
    exercises: { exercise_name: string; sets: number; reps: string; rest_seconds: number }[];
  }[];
  /** `null` quando a triagem não liberou dieta. */
  meals:
    | { name: string; meal_time: string; items: { food_name: string; quantity: number }[] }[]
    | null;
  explanation: string;
}

/** A meta fixada pelo código, como a tela de plano mostra. */
export interface OnboardingPlanTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** As travas que mexeram na meta, para a tela explicar (ADR-0044). */
  guards: DietGuard[];
}

/**
 * O plano que espera "Aprovar plano" (ADR-0020): nada é gravado antes disso. É
 * a cópia que a pessoa vê em O9, e é ela que a aprovação grava.
 */
export interface OnboardingPlanPending {
  proposal: PractitionerPlanProposal;
  /** `null` quando a triagem não liberou dieta. */
  target: OnboardingPlanTarget | null;
  /** As calorias de cada refeição, pelo banco de alimentos, na ordem de `meals`. */
  mealCalories: number[];
  goal: string;
  level: string;
  mealsPerDay: number;
  sessionMinutes: number;
}
