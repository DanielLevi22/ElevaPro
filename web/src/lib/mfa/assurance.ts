export type AuthenticatorAssuranceLevel = "aal1" | "aal2";

/** JWTs sem o claim de MFA representam somente a autenticação primária. */
export function assuranceLevelFromClaim(claim: unknown): AuthenticatorAssuranceLevel {
  return claim === "aal2" ? "aal2" : "aal1";
}

export function hasSecondFactor(level: AuthenticatorAssuranceLevel): boolean {
  return level === "aal2";
}
