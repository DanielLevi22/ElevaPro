import { supabase } from "@elevapro/supabase";

export type TotpChallenge = {
  factorId: string;
  qrCode?: string;
  secret?: string;
};

export class MfaSetupUnavailableError extends Error {
  constructor() {
    super(
      "A autenticação em duas etapas está indisponível no momento. Tente novamente mais tarde.",
    );
    this.name = "MfaSetupUnavailableError";
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

/** Informa se a sessão atual já completou o segundo fator. */
export async function hasCurrentMfaAssurance(): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data.currentLevel === "aal2";
}

/** Inscreve um autenticador TOTP; o segredo fica exclusivamente no Supabase. */
export async function beginTotpChallenge(): Promise<TotpChallenge> {
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;

  const totpFactors = factors.all.filter((factor) => factor.factor_type === "totp");
  const verifiedFactor = totpFactors.find((factor) => factor.status === "verified");
  if (verifiedFactor) return { factorId: verifiedFactor.id };

  // QR Code não é recuperável depois que a tela fecha. Remover somente fatores
  // pendentes torna "Configurar" idempotente sem tocar no autenticador já ativo.
  for (const pendingFactor of totpFactors.filter((factor) => factor.status === "unverified")) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({
      factorId: pendingFactor.id,
    });
    if (unenrollError) throw unenrollError;
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Eleva Pro",
  });
  if (error) {
    if (hasErrorCode(error, "mfa_totp_enroll_not_enabled")) throw new MfaSetupUnavailableError();
    throw error;
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
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
