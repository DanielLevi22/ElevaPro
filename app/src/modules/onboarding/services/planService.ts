import type { OnboardingAdjustment, OnboardingPlanPending } from '@elevapro/shared';
import { tokenDaSessao } from '@/auth';
import { postBff } from '@/shared/bff';

/**
 * Pede ao BFF o plano do onboarding (O8). Nada é gravado: a proposta fica
 * pendente até "Aprovar plano" (ADR-0020).
 *
 * @example const plan = await generateOnboardingPlan();
 */
export async function generateOnboardingPlan(): Promise<OnboardingPlanPending> {
  const { plan } = await postBff<{ plan: OnboardingPlanPending }>(
    '/api/ai/student/onboarding/plan',
    {},
    { token: tokenDaSessao() }
  );
  return plan;
}

/**
 * Aprova o plano pendente (O9): o servidor grava a cópia que a pessoa viu.
 *
 * @example await approveOnboardingPlan();
 */
export async function approveOnboardingPlan(): Promise<void> {
  await postBff('/api/ai/student/onboarding/approve', {}, { token: tokenDaSessao() });
}

/**
 * Pede um ajuste de O10 (ou desfaz o último). O servidor troca a proposta
 * pendente e devolve a nova; nada é gravado até aprovar.
 *
 * @example const { plan, canUndo } = await adjustOnboardingPlan({ kind: 'cheaper' });
 */
export async function adjustOnboardingPlan(
  adjustment: OnboardingAdjustment
): Promise<{ plan: OnboardingPlanPending; canUndo: boolean }> {
  return postBff('/api/ai/student/onboarding/adjust', adjustment, { token: tokenDaSessao() });
}
