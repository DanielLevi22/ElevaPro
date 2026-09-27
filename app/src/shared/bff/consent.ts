import { BffHttpError } from './client';

/** Distingue o pré-requisito de consentimento de outras recusas de acesso.
 * @example if (isConsentRequired(failure)) openConsent();
 */
export function isConsentRequired(failure: unknown): boolean {
  return (
    failure instanceof BffHttpError && failure.status === 403 && failure.code === 'consent_required'
  );
}
