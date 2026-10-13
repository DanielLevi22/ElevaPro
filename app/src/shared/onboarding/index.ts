import type { AccountType } from '@elevapro/shared';
import { ROUTES } from '@/navigation/types';

/**
 * Ligado por ambiente, como as Passkeys: o onboarding só abre ao público depois
 * da validação do CREF, do CRN e do parecer jurídico (ADR-0044).
 *
 * Mora no `shared` porque o cadastro e o guarda do onboarding leem o mesmo
 * interruptor, e um módulo não importa outro.
 *
 * @example if (isOnboardingEnabled()) router.replace(ROUTES.ONBOARDING.WELCOME);
 */
export function isOnboardingEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ONBOARDING_ENABLED === 'true';
}

/**
 * Para onde o cadastro leva. O Praticante vai direto às boas-vindas do
 * onboarding (#365): passar antes pela tela inicial fazia ela piscar até o
 * guarda desviar. Os outros papéis seguem para a tela inicial.
 *
 * @example router.replace(routeAfterSignUp('member'));
 */
export function routeAfterSignUp(
  accountType: AccountType
): typeof ROUTES.ONBOARDING.WELCOME | typeof ROUTES.TABS.ROOT {
  return accountType === 'member' && isOnboardingEnabled()
    ? ROUTES.ONBOARDING.WELCOME
    : ROUTES.TABS.ROOT;
}
