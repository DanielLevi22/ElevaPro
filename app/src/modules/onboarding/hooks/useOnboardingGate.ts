import type { AccountType } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { registrarAviso } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { hasCompletedAnamnesis } from '../services/anamnesisCompletion';
import { isOnboardingEnabled, shouldEnterOnboarding } from '../services/onboardingGate';

interface OnboardingGateParams {
  studentId: string | null;
  accountType: AccountType | null;
  inOnboarding: boolean;
}

/**
 * Leva o Praticante sem anamnese concluída ao onboarding, na entrada do app.
 *
 * Consulta de novo cada vez que a pessoa sai do onboarding: quem acabou de
 * concluir não pode ser mandado de volta por uma resposta antiga.
 *
 * @example useOnboardingGate({ studentId: session?.user.id ?? null, accountType, inOnboarding });
 */
export function useOnboardingGate({ studentId, accountType, inOnboarding }: OnboardingGateParams) {
  const router = useRouter();

  useEffect(() => {
    const base = { enabled: isOnboardingEnabled(), accountType, inOnboarding };
    // Pergunta ao guarda antes de consultar: quem nunca seria desviado não paga a consulta.
    if (!studentId || !shouldEnterOnboarding({ ...base, anamnesisCompleted: false })) return;

    let active = true;
    hasCompletedAnamnesis(studentId)
      .then((anamnesisCompleted) => {
        if (active && shouldEnterOnboarding({ ...base, anamnesisCompleted })) {
          router.replace(ROUTES.ONBOARDING.WELCOME);
        }
      })
      .catch(() => registrarAviso('onboarding.consultar_anamnese', { caiuNaTelaInicial: true }));

    return () => {
      active = false;
    };
  }, [studentId, accountType, inOnboarding, router]);
}
