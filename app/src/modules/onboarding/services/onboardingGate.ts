import type { AccountType } from '@elevapro/shared';

export { isOnboardingEnabled } from '@/shared/onboarding';

export interface OnboardingGateInput {
  enabled: boolean;
  accountType: AccountType | null;
  /** `null` enquanto a consulta não voltou: na dúvida, ninguém é desviado. */
  anamnesisCompleted: boolean | null;
  inOnboarding: boolean;
  /**
   * Recusou o consentimento de saúde no onboarding. Sem o aceite a anamnese não
   * pode ser gravada (0083) e nunca fica concluída: sem isto, o guarda mandaria a
   * pessoa de volta a O1 a cada abertura, por uma recusa que é direito dela.
   */
  consentDeclined: boolean;
}

/**
 * Quem a entrada do app leva ao onboarding: só o Praticante sem anamnese
 * concluída (#365). O Aluno com especialista entra pelo convite e não passa por
 * aqui.
 *
 * Falha de rede deixa `anamnesisCompleted` nulo e a pessoa segue para a tela
 * inicial: prender alguém no onboarding porque a consulta caiu seria pior.
 *
 * @example shouldEnterOnboarding({ enabled: true, accountType: 'member', anamnesisCompleted: false, inOnboarding: false, consentDeclined: false }) // true
 */
export function shouldEnterOnboarding(input: OnboardingGateInput): boolean {
  if (!input.enabled || input.inOnboarding || input.consentDeclined) return false;
  // `member` ainda é o Praticante no código, até a migração do ADR-0028.
  if (input.accountType !== 'member') return false;
  return input.anamnesisCompleted === false;
}
