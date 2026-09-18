import { supabase } from "@elevapro/supabase";
import type { AccountRegistration } from "./registration.types";

/**
 * Provisiona a conta pelo BFF e inicia a sessão criada.
 *
 * @example
 * await registerAccount({ role, services, credentials });
 */
export async function registerAccount(registration: AccountRegistration): Promise<void> {
  const { credentials } = registration;
  const endpoint =
    registration.role === "student" ? "/api/auth/register/student" : "/api/auth/register";
  const body =
    registration.role === "student"
      ? {
          email: credentials.email.toLowerCase(),
          password: credentials.password,
          full_name: credentials.fullName,
        }
      : {
          email: credentials.email.toLowerCase(),
          password: credentials.password,
          full_name: credentials.fullName,
          service_types: registration.services,
        };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Não foi possível criar a conta.");

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email.toLowerCase(),
    password: credentials.password,
  });
  if (error) throw error;
}
