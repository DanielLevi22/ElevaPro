import { type ConsentPurpose, type ConsentStatus, createHealthService } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
import { CONSENT_STATUS_KEY, consentStatusKey } from '@/shared/consentQueryKeys';
import { refreshDailyNotices } from '@/shared/notices';
import { AUTHORIZATIONS, type Authorization } from '../services/authorizations';

const healthService = createHealthService(supabase);

export interface AuthorizationItem {
  authorization: Authorization;
  /** `null` enquanto carrega ou quando a consulta falha. */
  status: ConsentStatus | null;
}

/**
 * Cada finalidade com o estado do aceite, consultadas **separadamente**, e a
 * retirada de uma só.
 *
 * Retirar invalida todo `consentStatus`: o health check e a Saúde do dia leem o
 * mesmo aceite, e seguiriam dizendo "tudo certo" até a próxima abertura. E
 * reagenda os avisos: a refeição e a água saem do aviso e do widget.
 *
 * @example const { items, revoke } = useAuthorizations(user.id);
 */
export function useAuthorizations(studentId: string): {
  items: AuthorizationItem[];
  revoke: (purpose: ConsentPurpose) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: AUTHORIZATIONS.map((authorization) => ({
      queryKey: consentStatusKey(studentId, authorization.purpose),
      queryFn: () =>
        avisandoSeFalhar('health.read_consent', () =>
          healthService.getConsentStatus(studentId, authorization.purpose)
        ),
    })),
  });

  const revoke = async (purpose: ConsentPurpose) => {
    await healthService.revokeCollectionConsent(studentId, purpose);
    await queryClient.invalidateQueries({ queryKey: [CONSENT_STATUS_KEY] });
    // Os avisos e o widget que dependem de dado de saúde param na hora (#344).
    await refreshDailyNotices(studentId);
  };

  return {
    items: AUTHORIZATIONS.map((authorization, index) => ({
      authorization,
      status: results[index]?.data ?? null,
    })),
    revoke,
  };
}
