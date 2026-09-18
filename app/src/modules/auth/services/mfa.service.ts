import { createTotpProtocol, type TotpEnrollment } from '@elevapro/shared';
import { supabase } from '@elevapro/supabase';

export type TotpChallenge = Pick<TotpEnrollment, 'factorId' | 'secret' | 'uri'>;

const protocol = createTotpProtocol(supabase.auth.mfa);

export const hasCurrentMfaAssurance = protocol.hasCurrentMfaAssurance;
export const verifyTotp = protocol.verifyTotp;

export async function beginTotpChallenge(): Promise<TotpChallenge> {
  const enrollment = await protocol.beginTotpChallenge();
  return { factorId: enrollment.factorId, secret: enrollment.secret, uri: enrollment.uri };
}
