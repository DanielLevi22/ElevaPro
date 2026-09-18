import { PASSWORD_REQUIREMENTS_ERROR } from "./password-policy";

/**
 * Traduz falhas conhecidas de autenticação sem expor detalhes do provedor.
 *
 * @example
 * userFacingAuthError("User already registered") // "Este e-mail já possui uma conta."
 */
export function userFacingAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already registered") ||
    normalized.includes("email_exists") ||
    normalized.includes("já cadastrado")
  ) {
    return "Este e-mail já possui uma conta.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (normalized.includes("password") || normalized.includes("senha")) {
    return PASSWORD_REQUIREMENTS_ERROR;
  }
  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  return "Não foi possível concluir o cadastro. Tente novamente.";
}
