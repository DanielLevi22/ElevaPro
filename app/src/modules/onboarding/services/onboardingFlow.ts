import { ROUTES } from '@/navigation/types';

/** O que a pessoa escolheu montar logo depois das boas-vindas. */
export type PlanScope = 'both' | 'training' | 'diet';

export type OnboardingStep =
  | 'welcome'
  | 'scope'
  | 'goal'
  | 'level'
  | 'consent'
  | 'about'
  | 'scanOffer'
  | 'health'
  | 'training'
  | 'food';

interface FlowContext {
  scope: PlanScope | null;
  /** O resultado da triagem; `null` antes de O5 ou quando não houve dieta a liberar. */
  dietAllowed: boolean | null;
}

export type OnboardingRoute = (typeof ROUTES.ONBOARDING)[keyof typeof ROUTES.ONBOARDING];

const ROUTES_OF_ONBOARDING: readonly string[] = Object.values(ROUTES.ONBOARDING);

/**
 * Onde retomar quem fechou o app no meio do onboarding (#365): a tela em que
 * parou. As respostas dela estão no servidor, e as escolhas de antes do aceite,
 * no aparelho.
 *
 * O8 e O9 voltam a O8: o plano não aprovado não fica no aparelho, e O8 o monta
 * de novo. A triagem volta a O5, porque o resultado depende das respostas de
 * lá. Depois de aprovar, ou sem tela lembrada, começa nas boas-vindas.
 *
 * @example resumeRoute('/onboarding/food') // '/onboarding/food'
 * @example resumeRoute('/onboarding/plan') // '/onboarding/building'
 */
export function resumeRoute(last: string | null): OnboardingRoute {
  if (!last || !ROUTES_OF_ONBOARDING.includes(last)) return ROUTES.ONBOARDING.WELCOME;
  if (last === ROUTES.ONBOARDING.PLAN) return ROUTES.ONBOARDING.BUILDING;
  if (last === ROUTES.ONBOARDING.SCREENING) return ROUTES.ONBOARDING.HEALTH;
  if (last === ROUTES.ONBOARDING.HEALTH_CONNECT) return ROUTES.ONBOARDING.WELCOME;
  return last as OnboardingRoute;
}

/**
 * A tela seguinte do onboarding, pela escolha do que montar (#365). Cada escolha
 * pergunta só o que usa (Art. 6°, III): só treino passa por O4 só para a idade,
 * sem peso, altura nem escaneamento; só dieta pula o nível, que só define o treino.
 *
 * Todo caminho passa por O4: o plano automático é só para maiores de 18
 * (ADR-0044), e só treino pulava a única tela que pergunta a idade.
 *
 * Mora aqui, e não em cada tela, para o caminho de cada escolha ser lido e
 * testado num lugar só.
 *
 * @example router.push(nextOnboardingStep('consent', { scope: 'training', dietAllowed: null }))
 */
export function nextOnboardingStep(
  from: OnboardingStep,
  { scope, dietAllowed }: FlowContext
): OnboardingRoute {
  const wantsDiet = scope !== 'training';
  const wantsTraining = scope !== 'diet';
  switch (from) {
    case 'welcome':
      return ROUTES.ONBOARDING.SCOPE;
    case 'scope':
      return ROUTES.ONBOARDING.GOAL;
    case 'goal':
      return wantsTraining ? ROUTES.ONBOARDING.LEVEL : ROUTES.ONBOARDING.CONSENT;
    case 'level':
      return ROUTES.ONBOARDING.CONSENT;
    case 'consent':
      return ROUTES.ONBOARDING.ABOUT;
    case 'about':
      return wantsDiet ? ROUTES.ONBOARDING.SCAN_OFFER : ROUTES.ONBOARDING.HEALTH;
    case 'scanOffer':
      return ROUTES.ONBOARDING.HEALTH;
    case 'health':
      return ROUTES.ONBOARDING.TRAINING;
    case 'training':
      return wantsDiet && dietAllowed !== false
        ? ROUTES.ONBOARDING.FOOD
        : ROUTES.ONBOARDING.BUILDING;
    case 'food':
      return ROUTES.ONBOARDING.BUILDING;
  }
}
