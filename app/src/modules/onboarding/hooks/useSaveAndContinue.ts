import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/auth';
import { showAlert } from '@/components/ui/appAlert';
import { registrarFalha } from '@/lib/registro';
import { saveOnboardingAnswers } from '../services/onboardingAnswers';

type Href = Parameters<ReturnType<typeof useRouter>['push']>[0];

/**
 * Grava as respostas de uma tela e segue para a próxima; se a gravação falhar,
 * a pessoa fica na tela com as respostas e o aviso.
 *
 * @example const { saving, saveAndGo } = useSaveAndContinue('onboarding.salvar_treino');
 * saveAndGo({ training_days: 4 }, ROUTES.ONBOARDING.FOOD);
 */
export function useSaveAndContinue(failureEvent: string) {
  const router = useRouter();
  const userId = useAuthStore((state) => state.session?.user.id ?? null);
  const [saving, setSaving] = useState(false);

  async function saveAndGo(answers: Record<string, unknown>, next: Href, complete = false) {
    if (!userId) return;
    setSaving(true);
    try {
      await saveOnboardingAnswers(userId, answers, { complete });
      // Concluído, a pilha do onboarding não tem para onde voltar.
      if (complete) router.replace(next);
      else router.push(next);
    } catch {
      registrarFalha(failureEvent);
      showAlert({
        title: 'Não foi possível salvar',
        message: 'Suas respostas continuam aqui. Confira sua conexão e tente de novo.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return { saving, saveAndGo };
}
