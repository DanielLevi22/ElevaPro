import { PASSWORD_REQUIREMENTS_ERROR } from "./messages";
import { passwordSchema } from "./schema";

/**
 * Devolve uma mensagem segura para a interface, sem nunca incluir a senha.
 *
 * @example
 * passwordValidationError("Senha@123") // null
 */
export function passwordValidationError(password: unknown): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : PASSWORD_REQUIREMENTS_ERROR;
}
