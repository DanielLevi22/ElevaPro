import type { AccountStatus, AccountType, ServiceType, UserContext } from "@elevapro/shared";
import { supabase } from "./client";

// A tabela de permissões vive em `shared/src/auth/abilities.ts`. Ela era
// duplicada aqui e no mobile, e divergiu: o mobile concedia `manage
// Periodization` ao papel `member` e este arquivo não — a mesma conta via
// botões diferentes em cada plataforma.
export {
  type Action,
  type AppAbility,
  defineAbilitiesFor,
  type Subject,
  type UserContext,
} from "@elevapro/shared";

export async function getUserContext(userId: string): Promise<UserContext> {
  const { data: user, error } = await supabase
    .from("profiles")
    .select("account_type, account_status")
    .eq("id", userId)
    .single();

  if (error || !user) throw new Error("User not found");

  const context: UserContext = {
    accountType: user.account_type as AccountType,
    accountStatus: user.account_status as AccountStatus,
  };

  if (user.account_type === "specialist") {
    const { data: services } = await supabase
      .from("specialist_services")
      .select("service_type")
      .eq("specialist_id", userId);

    context.services = (services?.map((s) => s.service_type) || []) as ServiceType[];
  }

  return context;
}
