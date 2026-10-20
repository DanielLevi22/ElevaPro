import type { AccountType } from "../types/auth.types";

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

/**
 * Diz se o papel precisa de segundo fator (TOTP ou Passkey) para acessar.
 *
 * Só o admin precisa: o especialista travava no cadastro do autenticador
 * (ADR-0047). TOTP e Passkey seguem opcionais para os outros papéis. Para
 * voltar a exigir do especialista, inclua-o aqui e no papel listado em
 * `private.current_session_meets_mfa_requirement()`; nenhum chamador muda.
 *
 * @example
 * if (isStrongAuthRequired(accountType) && !(await hasCurrentPrivilegedProof())) {
 *   router.replace("/auth/mfa");
 * }
 */
export function isStrongAuthRequired(accountType: AccountType | null): boolean {
  return accountType === "admin";
}
