import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * Guarda a tela do onboarding aberta agora, para o guarda retomar dela se a
 * pessoa fechar o app (#365). Fica no layout do onboarding: toda tela passa por
 * ele, sem cada uma lembrar de gravar.
 *
 * @example useRememberOnboardingStep(); // em app/onboarding/_layout.tsx
 */
export function useRememberOnboardingStep() {
  const pathname = usePathname();
  const visit = useOnboardingStore((state) => state.visit);
  useEffect(() => {
    if (pathname.startsWith('/onboarding/')) visit(pathname);
  }, [pathname, visit]);
}
