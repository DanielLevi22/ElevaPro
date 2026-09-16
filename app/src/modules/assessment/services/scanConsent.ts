import { createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { registrarFalha } from '@/lib/registro';

/**
 * Grava a autorização de dados de saúde pedida pelo body scan. Devolve se deu
 * certo. A introdução e o processamento pedem a mesma autorização, e a falha
 * se registra igual nos dois.
 *
 * @example if (await grantScanConsent(userId)) começar();
 */
export async function grantScanConsent(userId: string): Promise<boolean> {
  try {
    await createHealthService(supabase).grantCollectionConsent(userId);
    return true;
  } catch {
    // Sem o erro: o do PostgREST pode carregar o payload do consentimento.
    registrarFalha('body_scan.grant_consent');
    return false;
  }
}
