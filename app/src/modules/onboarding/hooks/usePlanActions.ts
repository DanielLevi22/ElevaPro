import type { OnboardingAdjustment } from '@elevapro/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { registrarFalha } from '@/lib/registro';
import { ROUTES } from '@/navigation/types';
import { saveOnboardingAnswers } from '../services/onboardingAnswers';
import { adjustOnboardingPlan, approveOnboardingPlan } from '../services/planService';
import { usePlanDraftStore } from '../store/planDraftStore';

/**
 * As duas ações de O9: aprovar o plano e ajustá-lo (O10). Falha deixa a pessoa
 * na tela com o plano que já tinha, e o aviso.
 *
 * @example const { approving, adjusting, approve, adjust } = usePlanActions();
 */
export function usePlanActions() {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [approving, setApproving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  async function approve() {
    if (!userId) return;
    setApproving(true);
    try {
      await approveOnboardingPlan();
      // Concluir a anamnese é o que tira a pessoa do guarda de rotas.
      await saveOnboardingAnswers(userId, {}, { complete: true });
      // Sai antes de limpar: o plano na memória é dado de saúde e não fica, mas
      // limpar com O9 ainda na tela fazia a tela reagir à ausência dele.
      router.replace(ROUTES.ONBOARDING.HEALTH_CONNECT);
      usePlanDraftStore.getState().setPlan(null);
    } catch {
      falhou('onboarding.aprovar_plano', 'Não foi possível aprovar');
    } finally {
      setApproving(false);
    }
  }

  async function adjust(adjustment: OnboardingAdjustment) {
    setAdjusting(true);
    try {
      const { plan, canUndo } = await adjustOnboardingPlan(adjustment);
      usePlanDraftStore.getState().setPlan(plan, canUndo);
    } catch {
      falhou('onboarding.ajustar_plano', 'Não foi possível ajustar', { ajuste: adjustment.kind });
    } finally {
      setAdjusting(false);
    }
  }

  return { approving, adjusting, approve, adjust };
}

function falhou(evento: string, title: string, contexto: Record<string, string> = {}) {
  registrarFalha(evento, contexto);
  showAlert({
    title,
    message: 'Seu plano continua aqui. Confira sua conexão e tente de novo.',
    type: 'error',
  });
}
