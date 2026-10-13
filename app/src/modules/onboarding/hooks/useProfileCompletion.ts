import { useEffect, useState } from 'react';
import { useAuthStore } from '@/auth';
import { loadOnboardingAnswers } from '../services/onboardingAnswers';
import { isOnboardingEnabled } from '../services/onboardingGate';
import { hasAnyScan } from '../services/scanStatus';
import { useOnboardingStore } from '../store/onboardingStore';

/**
 * O que a tela inicial oferece ao Praticante: liberar a dieta (sem aceite ou sem
 * triagem) ou conhecer o escaneamento corporal, que pode ser dispensado.
 */
export type ProfileGap = 'consent_declined' | 'screening_undisclosed' | 'scan_never_done';

/** Dispensado, o cartão do escaneamento volta depois disto: lembrar não é cobrar. */
const SCAN_CARD_SNOOZE_MS = 30 * 86_400_000;

/**
 * O que falta para o plano do Praticante ficar completo, para o cartão da tela
 * inicial (O12): recusou o aceite de saúde, não respondeu a triagem ou ainda não
 * conhece o escaneamento. Pular O6 e O7 não entra: o plano já saiu com o padrão.
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
  const [noScan, setNoScan] = useState(false);
  const dismissedAt = useOnboardingStore((state) =>
    state.ownerId === studentId ? state.scanCardDismissedAt : null
  );
  const relevant = isOnboardingEnabled() && accountType === 'member' && studentId !== null;

  useEffect(() => {
    if (!relevant || declined || !studentId) return;
    loadOnboardingAnswers(studentId)
      .then((answers) => setUndisclosed(answers.diet_screening_reason === 'undisclosed'))
      // Sem as respostas, o cartão some: na dúvida, não cobra nada de ninguém.
      .catch(() => setUndisclosed(false));
    hasAnyScan(studentId)
      .then((has) => setNoScan(!has))
      .catch(() => setNoScan(false));
  }, [relevant, declined, studentId]);

  if (!relevant) return null;
  if (declined) return 'consent_declined';
  if (undisclosed) return 'screening_undisclosed';
  const snoozed = dismissedAt !== null && Date.now() - dismissedAt < SCAN_CARD_SNOOZE_MS;
  return noScan && !snoozed ? 'scan_never_done' : null;
}
