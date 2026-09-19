/**
 * Decide se uma sessão pode abrir o painel administrativo.
 *
 * @example
 * isAdminSessionAllowed("admin", true); // true
 */
export function isAdminSessionAllowed(
  accountType: string | null | undefined,
  hasMfa: boolean,
): boolean {
  return accountType === "admin" && hasMfa;
}
