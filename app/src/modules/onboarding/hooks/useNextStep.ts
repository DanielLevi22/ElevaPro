import { useRouter } from 'expo-router';
import { useAuthStore } from '@/auth';
import { ROUTES } from '@/navigation/types';
import { hasCurrentHealthConsent } from '../services/consentStep';
import { nextOnboardingStep, type OnboardingStep } from '../services/onboardingFlow';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * Leva à tela seguinte do onboarding pela escolha do que montar. Se a seguinte
 * é o aceite e a pessoa já aceitou, pula direto para depois dele (o texto não
 * pisca na frente de quem já aceitou).
 *
 * @example const goNext = useNextStep(); await goNext('goal');
 */
export function useNextStep() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);

  return async (from: OnboardingStep) => {
    const { scope, dietAllowed } = useOnboardingStore.getState();
    const ctx = { scope, dietAllowed };
    const next = nextOnboardingStep(from, ctx);
    const consented =
      next === ROUTES.ONBOARDING.CONSENT && userId ? await hasCurrentHealthConsent(userId) : false;
    router.push(consented ? nextOnboardingStep('consent', ctx) : next);
  };
}
