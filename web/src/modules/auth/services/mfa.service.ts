import { supabase } from "@elevapro/supabase";

export type TotpEnrollment = {
  factorId: string;
  qrCode: string;
};

/** Informa se a sessão atual já completou o segundo fator. */
export async function hasCurrentMfaAssurance(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data.currentLevel === "aal2";
}

/** Inscreve um autenticador TOTP; o segredo fica exclusivamente no Supabase. */
export async function enrollTotp(): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Eleva Pro",
  });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code };
}

/** Confirma um código TOTP e eleva a sessão atual para AAL2. */
export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) throw error;
}
