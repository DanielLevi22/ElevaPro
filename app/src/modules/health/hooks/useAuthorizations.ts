import { type ConsentStatus, createHealthService, type Finalidade } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { avisandoSeFalhar } from '@/lib/registro';
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
 * mesmo aceite, e seguiriam dizendo "tudo certo" até a próxima abertura.
 *
 * @example const { items, revoke } = useAuthorizations(user.id);
 */
export function useAuthorizations(studentId: string): {
  items: AuthorizationItem[];
  revoke: (purpose: Finalidade) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: AUTHORIZATIONS.map((authorization) => ({
      queryKey: ['consentStatus', studentId, authorization.purpose.tipo],
      queryFn: () =>
        avisandoSeFalhar('health.read_consent', () =>
          healthService.getConsentStatus(studentId, authorization.purpose)
        ),
    })),
  });

  const revoke = async (purpose: Finalidade) => {
    await healthService.revokeCollectionConsent(studentId, purpose);
    await queryClient.invalidateQueries({ queryKey: ['consentStatus'] });
  };

  return {
    items: AUTHORIZATIONS.map((authorization, index) => ({
      authorization,
      status: results[index]?.data ?? null,
    })),
    revoke,
  };
}
