import type { ConsentPurpose } from '@elevapro/shared';

/**
 * A chave do TanStack Query para o estado de um aceite.
 *
 * Minhas autorizações e o ranking leem o mesmo aceite: com a chave num lugar só,
 * retirar numa tela atualiza a outra, e invalidar o prefixo alcança as duas.
 *
 * @example useQuery({ queryKey: consentStatusKey(user.id, RANKING_PURPOSE), … })
 */
export const CONSENT_STATUS_KEY = 'consentStatus';

export function consentStatusKey(userId: string, purpose: ConsentPurpose) {
  return [CONSENT_STATUS_KEY, userId, purpose.type] as const;
}
