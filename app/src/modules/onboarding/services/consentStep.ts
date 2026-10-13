import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

/**
 * Se a pessoa já aceitou a versão vigente do consentimento de saúde: quem
 * aceitou pula a etapa do aceite.
 *
 * Perguntado **antes** de abrir a etapa, e não por ela: abrir a tela e pular
 * depois da consulta fazia o texto do consentimento piscar na frente de quem já
 * tinha aceitado.
 *
 * @example router.push((await hasCurrentHealthConsent(user.id)) ? ROUTES.ONBOARDING.ABOUT : ROUTES.ONBOARDING.CONSENT);
 */
export async function hasCurrentHealthConsent(studentId: string): Promise<boolean> {
  try {
    const { state } = await createHealthService(supabase).getConsentStatus(studentId);
    return state === 'granted';
  } catch {
    // Na dúvida, a etapa do aceite aparece: perguntar de novo é melhor que gravar sem.
    return false;
  }
}
