import { supabase } from '@elevapro/supabase';

export interface TotpChallenge {
  factorId: string;
  uri?: string;
}

/** Informa se a sessao atual ja completou o segundo fator. */
export async function hasCurrentMfaAssurance(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data.currentLevel === 'aal2';
}

/**
 * Reutiliza o autenticador confirmado ou inicia sua configuracao.
 *
 * @example
 * const challenge = await beginTotpChallenge();
 */
export async function beginTotpChallenge(): Promise<TotpChallenge> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;

  const verifiedFactor = factors.totp.find((factor) => factor.status === 'verified');
  if (verifiedFactor) return { factorId: verifiedFactor.id };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Eleva Pro',
  });
  if (error) throw error;

  return { factorId: data.id, uri: data.totp.uri };
}

/** Confirma um codigo TOTP e eleva a sessao atual para AAL2. */
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
