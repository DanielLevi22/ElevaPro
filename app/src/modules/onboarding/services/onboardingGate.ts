import type { AccountType } from '@elevapro/shared';

/**
 * Ligado por ambiente, como as Passkeys: o onboarding só abre ao público depois
 * da validação do CREF, do CRN e do parecer jurídico (ADR-0044).
 *
 * @example if (isOnboardingEnabled()) router.replace(ROUTES.ONBOARDING.WELCOME);
 */
export function isOnboardingEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ONBOARDING_ENABLED === 'true';
}

export interface OnboardingGateInput {
  enabled: boolean;
  accountType: AccountType | null;
  /** `null` enquanto a consulta não voltou: na dúvida, ninguém é desviado. */
  anamnesisCompleted: boolean | null;
  inOnboarding: boolean;
}

/**
 * Quem a entrada do app leva ao onboarding: só o Praticante sem anamnese
 * concluída (#365). O Aluno com especialista entra pelo convite e não passa por
 * aqui.
 *
 * Falha de rede deixa `anamnesisCompleted` nulo e a pessoa segue para a tela
 * inicial: prender alguém no onboarding porque a consulta caiu seria pior.
 *
 * @example shouldEnterOnboarding({ enabled: true, accountType: 'member', anamnesisCompleted: false, inOnboarding: false }) // true
 */
export function shouldEnterOnboarding(input: OnboardingGateInput): boolean {
  if (!input.enabled || input.inOnboarding) return false;
  // `member` ainda é o Praticante no código, até a migração do ADR-0028.
  if (input.accountType !== 'member') return false;
  return input.anamnesisCompleted === false;
}
