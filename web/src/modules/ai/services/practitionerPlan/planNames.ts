import type { OnboardingPlanPending } from "./types";

/**
 * O nome do treino diz o que ele é, e não que é o primeiro: o objetivo e
 * quantas vezes por semana, sem contar a sessão opcional do esporte.
 *
 * @example trainingPlanName(pendente) // "Hipertrofia · 3x por semana"
 */
export function trainingPlanName(pending: OnboardingPlanPending): string {
  const sessions = pending.proposal.workouts.filter((workout) => !workout.optional).length;
  return `${pending.goal} · ${sessions}x por semana`;
}

/**
 * O nome da dieta: o objetivo e a meta do dia, que é o que distingue uma dieta
 * da próxima quando o check-in recalibrar.
 *
 * @example dietPlanName(pendente) // "Emagrecimento · 1.850 kcal por dia"
 */
export function dietPlanName(pending: OnboardingPlanPending): string {
  const calories = (pending.target?.calories ?? 0).toLocaleString("pt-BR");
  return `${pending.goal} · ${calories} kcal por dia`;
}
