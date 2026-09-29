export interface SessionProofClaims {
  aal?: unknown;
  amr?: unknown;
}

/**
 * Identifica o método Passkey no JWT previamente validado pelo Supabase.
 * @example hasPasskeySessionProof({ amr: [{ method: "passkey" }] })
 */
export function hasPasskeySessionProof(claims: SessionProofClaims | null): boolean {
  if (!Array.isArray(claims?.amr)) return false;

  return claims.amr.some(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "method" in entry &&
      entry.method === "passkey",
  );
}

/**
 * Aceita MFA de migração ou Passkey registrada no JWT assinado.
 * @example hasPrivilegedSessionProof({ aal: "aal2" })
 */
export function hasPrivilegedSessionProof(claims: SessionProofClaims | null): boolean {
  return claims?.aal === "aal2" || hasPasskeySessionProof(claims);
}
