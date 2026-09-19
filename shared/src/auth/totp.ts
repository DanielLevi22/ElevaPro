export type TotpFactor = { id: string; factor_type: string; status: string };

export type TotpPort = {
  challenge(input: { factorId: string }): Promise<{ data?: { id: string } | null; error: unknown }>;
  enroll(input: { factorType: "totp"; friendlyName: string }): Promise<{
    data?: { id: string; totp: { qr_code?: string; secret?: string; uri?: string } } | null;
    error: unknown;
  }>;
  getAuthenticatorAssuranceLevel(): Promise<{
    data?: { currentLevel?: string | null } | null;
    error: unknown;
  }>;
  listFactors(): Promise<{ data?: { all: TotpFactor[] } | null; error: unknown }>;
  unenroll(input: { factorId: string }): Promise<{ error: unknown }>;
  verify(input: {
    factorId: string;
    challengeId: string;
    code: string;
  }): Promise<{ error: unknown }>;
};

export type TotpEnrollment = { factorId: string; qrCode?: string; secret?: string; uri?: string };

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

export function createTotpProtocol(port: TotpPort) {
  return {
    async hasCurrentMfaAssurance(): Promise<boolean> {
      const { data, error } = await port.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      return data?.currentLevel === "aal2";
    },
    async beginTotpChallenge(): Promise<TotpEnrollment> {
      const { data, error } = await port.listFactors();
      if (error) throw error;
      const factors = data?.all.filter((factor) => factor.factor_type === "totp") ?? [];
      const verified = factors.find((factor) => factor.status === "verified");
      if (verified) return { factorId: verified.id };
      for (const factor of factors.filter((item) => item.status === "unverified")) {
        const { error: unenrollError } = await port.unenroll({ factorId: factor.id });
        if (unenrollError) throw unenrollError;
      }
      const enrollment = await port.enroll({ factorType: "totp", friendlyName: "Eleva Pro" });
      if (enrollment.error) {
        if (hasErrorCode(enrollment.error, "mfa_totp_enroll_not_enabled"))
          throw new MfaSetupUnavailableError();
        throw enrollment.error;
      }
      if (!enrollment.data) throw new Error("TOTP enrollment returned no factor.");
      return {
        factorId: enrollment.data.id,
        qrCode: enrollment.data.totp.qr_code,
        secret: enrollment.data.totp.secret,
        uri: enrollment.data.totp.uri,
      };
    },
    async verifyTotp(factorId: string, code: string): Promise<void> {
      const { data, error: challengeError } = await port.challenge({ factorId });
      if (challengeError || !data)
        throw challengeError ?? new Error("TOTP challenge returned no id.");
      const { error } = await port.verify({ factorId, challengeId: data.id, code });
      if (error) throw error;
    },
  };
}
