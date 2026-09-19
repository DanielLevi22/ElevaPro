import {
  createTotpProtocol,
  MfaSetupUnavailableError,
  type TotpEnrollment,
} from "@elevapro/shared";
import { supabase } from "@elevapro/supabase";

export type TotpChallenge = Pick<TotpEnrollment, "factorId" | "qrCode" | "secret">;

const protocol = createTotpProtocol(supabase.auth.mfa);

export const hasCurrentMfaAssurance = protocol.hasCurrentMfaAssurance;
export const verifyTotp = protocol.verifyTotp;
export { MfaSetupUnavailableError };

export async function beginTotpChallenge(): Promise<TotpChallenge> {
  const enrollment = await protocol.beginTotpChallenge();
  return { factorId: enrollment.factorId, qrCode: enrollment.qrCode, secret: enrollment.secret };
}
