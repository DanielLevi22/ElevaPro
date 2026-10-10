import { useEffect, useState } from 'react';
import { useAuthStore } from '@/auth';
import { loadOnboardingAnswers } from '../services/onboardingAnswers';
import { isOnboardingEnabled } from '../services/onboardingGate';
import { useOnboardingStore } from '../store/onboardingStore';

/** Por que o plano do Praticante está sem dieta, e como liberar. */
export type ProfileGap = 'consent_declined' | 'screening_undisclosed';

/**
 * O que falta para o plano do Praticante ficar completo, para o cartão da tela
 * inicial (O12): recusou o aceite de saúde, ou não respondeu a triagem. Pular
 * O6 e O7 não entra: o plano já saiu com o padrão.
 *
 * @example const gap = useProfileCompletion(); // 'consent_declined' | 'screening_undisclosed' | null
 */
export function useProfileCompletion(): ProfileGap | null {
  const studentId = useAuthStore((state) => state.session?.user.id ?? null);
  const accountType = useAuthStore((state) => state.accountType);
  const declined = useOnboardingStore(
    (state) => state.consentDeclined && state.ownerId === studentId
  );
  const [undisclosed, setUndisclosed] = useState(false);
  const relevant = isOnboardingEnabled() && accountType === 'member' && studentId !== null;

  useEffect(() => {
    if (!relevant || declined || !studentId) return;
    loadOnboardingAnswers(studentId)
      .then((answers) => setUndisclosed(answers.diet_screening_reason === 'undisclosed'))
      // Sem as respostas, o cartão some: na dúvida, não cobra nada de ninguém.
      .catch(() => setUndisclosed(false));
  }, [relevant, declined, studentId]);

  if (!relevant) return null;
  if (declined) return 'consent_declined';
  return undisclosed ? 'screening_undisclosed' : null;
}
