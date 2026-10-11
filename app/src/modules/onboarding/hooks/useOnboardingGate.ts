import type { AccountType } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { registrarAviso } from '@/lib/registro';
import { hasCompletedAnamnesis } from '../services/anamnesisCompletion';
import { resumeRoute } from '../services/onboardingFlow';
import { isOnboardingEnabled, shouldEnterOnboarding } from '../services/onboardingGate';
import { useOnboardingStore } from '../store/onboardingStore';

interface OnboardingGateParams {
  studentId: string | null;
  accountType: AccountType | null;
  inOnboarding: boolean;
}

/**
 * Leva o Praticante sem anamnese concluída ao onboarding, na entrada do app, na
 * tela em que ele parou (`resumeRoute`).
 *
 * Consulta de novo cada vez que a pessoa sai do onboarding: quem acabou de
 * concluir não pode ser mandado de volta por uma resposta antiga.
 *
 * @example useOnboardingGate({ studentId: session?.user.id ?? null, accountType, inOnboarding });
 */
export function useOnboardingGate({ studentId, accountType, inOnboarding }: OnboardingGateParams) {
  const router = useRouter();
  // Só vale a recusa da própria conta: a de outra conta no aparelho não dispensa ninguém.
  const consentDeclined = useOnboardingStore(
    (state) => state.consentDeclined && state.ownerId === studentId
  );

  useEffect(() => {
    const base = { enabled: isOnboardingEnabled(), accountType, inOnboarding, consentDeclined };
    // Pergunta ao guarda antes de consultar: quem nunca seria desviado não paga a consulta.
    if (!studentId || !shouldEnterOnboarding({ ...base, anamnesisCompleted: false })) return;

    let active = true;
    hasCompletedAnamnesis(studentId)
      .then((anamnesisCompleted) => {
        if (active && shouldEnterOnboarding({ ...base, anamnesisCompleted })) {
          const { lastRoute, ownerId } = useOnboardingStore.getState();
          // A tela lembrada é só da própria conta: outra conta no aparelho começa do zero.
          router.replace(resumeRoute(ownerId === studentId ? lastRoute : null));
        }
      })
      .catch(() => registrarAviso('onboarding.consultar_anamnese', { caiuNaTelaInicial: true }));

    return () => {
      active = false;
    };
  }, [studentId, accountType, inOnboarding, consentDeclined, router]);
}
