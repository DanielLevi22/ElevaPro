export interface SessionProofClaims {
  aal?: unknown;
  amr?: unknown;
}

/** Aceita MFA legado ou uma autenticação Passkey registrada no JWT assinado. */
export function hasPrivilegedSessionProof(claims: SessionProofClaims | null): boolean {
  if (claims?.aal === "aal2") return true;
  if (!Array.isArray(claims?.amr)) return false;

  return claims.amr.some(
    (entry: unknown) =>
      typeof entry === "object" &&
      entry !== null &&
      "method" in entry &&
      entry.method === "passkey",
  );
}
