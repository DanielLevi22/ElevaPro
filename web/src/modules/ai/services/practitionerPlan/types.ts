import type { DietGuard } from "@elevapro/shared";
import type { PractitionerPlanProposal } from "./planCheck";

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
 * O plano do onboarding que espera "Aprovar plano" (ADR-0020): nada é gravado
 * antes disso. É a cópia que a pessoa vê em O9, e é ela que a aprovação grava.
 */
export interface OnboardingPlanPending {
  proposal: PractitionerPlanProposal;
  /** `null` quando a triagem não liberou dieta. */
  target: OnboardingPlanTarget | null;
  goal: string;
  level: string;
  mealsPerDay: number;
}
